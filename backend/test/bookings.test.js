import assert from "node:assert/strict";
import { test } from "node:test";
import { BookingError, createBookingService } from "../src/bookings.js";

function futureStay() {
  const checkInDate = new Date();
  checkInDate.setUTCDate(checkInDate.getUTCDate() + 10);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setUTCDate(checkOutDate.getUTCDate() + 2);
  return {
    checkIn: checkInDate.toISOString().slice(0, 10),
    checkOut: checkOutDate.toISOString().slice(0, 10)
  };
}

function mockBookingPool({ capacity = 5, booked = 0 } = {}) {
  const queries = [];
  let committed = false;
  let rolledBack = false;
  let bookingInsert;
  const client = {
    query: async (sql, values = []) => {
      queries.push({ sql, values });
      if (sql === "COMMIT") committed = true;
      if (sql === "ROLLBACK") rolledBack = true;
      if (sql.includes("SELECT inventory.total_rooms")) {
        return { rows: [{ total_rooms: capacity, name: "Test Hotel", price: "1000" }] };
      }
      if (sql.includes("SELECT COALESCE(SUM(rooms)")) {
        return { rows: [{ booked_rooms: booked }] };
      }
      if (sql.includes("INSERT INTO public.room_bookings")) {
        bookingInsert = values;
      }
      return { rows: [] };
    },
    release() {}
  };

  return {
    pool: {
      query: async (sql, values) => {
        queries.push({ sql, values });
        return { rows: [{ total_rooms: capacity, booked_rooms: booked }] };
      },
      connect: async () => client
    },
    queries,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
    get bookingInsert() { return bookingInsert; }
  };
}

test("availability returns remaining rooms for overlapping date ranges", async () => {
  const mock = mockBookingPool({ capacity: 5, booked: 3 });
  const bookings = createBookingService({ pool: mock.pool });
  const stay = futureStay();

  const result = await bookings.getAvailability("42", stay.checkIn, stay.checkOut);

  assert.deepEqual(result, {
    totalRooms: 5,
    bookedRooms: 3,
    availableRooms: 2,
    ...stay
  });
  assert.deepEqual(mock.queries[0].values, ["42", stay.checkIn, stay.checkOut, 5]);
});

test("reservation calculates its server-side total and commits within a transaction", async () => {
  const mock = mockBookingPool({ capacity: 5, booked: 1 });
  const bookings = createBookingService({ pool: mock.pool });
  const stay = futureStay();

  const result = await bookings.createBooking({
    hotelId: "42",
    ...stay,
    rooms: 2,
    guestName: "  Cebu   Guest ",
    guestEmail: "GUEST@EXAMPLE.COM"
  });

  assert.equal(result.hotelName, "Test Hotel");
  assert.equal(result.rooms, 2);
  assert.equal(result.totalPrice, 4000);
  assert.match(result.reference, /^CS-[A-F0-9]{12}$/);
  assert.equal(mock.committed, true);
  assert.equal(mock.rolledBack, false);
  assert.match(mock.queries[2].sql, /FOR UPDATE OF inventory/);
  assert.equal(mock.bookingInsert[3], "Cebu Guest");
  assert.equal(mock.bookingInsert[4], "guest@example.com");
  assert.equal(mock.bookingInsert[8], 4000);
});

test("reservation rolls back if requested rooms exceed remaining inventory", async () => {
  const mock = mockBookingPool({ capacity: 2, booked: 1 });
  const bookings = createBookingService({ pool: mock.pool });
  const stay = futureStay();

  await assert.rejects(bookings.createBooking({
    hotelId: "42",
    ...stay,
    rooms: 2,
    guestName: "Cebu Guest",
    guestEmail: "guest@example.com"
  }), error => error instanceof BookingError && error.status === 409);

  assert.equal(mock.committed, false);
  assert.equal(mock.rolledBack, true);
  assert.equal(mock.bookingInsert, undefined);
});

test("invalid booking details are rejected before database access", async () => {
  let connected = false;
  const bookings = createBookingService({
    pool: {
      query: async () => ({ rows: [] }),
      connect: async () => {
        connected = true;
        throw new Error("unexpected connection");
      }
    }
  });
  const stay = futureStay();

  await assert.rejects(bookings.createBooking({
    hotelId: "42",
    ...stay,
    rooms: 11,
    guestName: "Cebu Guest",
    guestEmail: "guest@example.com"
  }), { code: "INVALID_ROOM_COUNT" });

  assert.equal(connected, false);
});

test("invalid calendar dates are reported as client errors", async () => {
  const bookings = createBookingService({
    pool: { query: async () => { throw new Error("database should not be queried"); } }
  });

  await assert.rejects(
    bookings.getAvailability("42", "2027-99-99", "2027-10-12"),
    { code: "INVALID_DATE", status: 400 }
  );
});
