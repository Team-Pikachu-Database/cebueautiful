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

test("reservation history filters by the authenticated account ID", async () => {
  let query;
  const bookings = createBookingService({
    pool: {
      query: async (sql, values) => {
        query = { sql, values };
        return { rows: [{
          reference: "CS-ABC123DEF456",
          hotel_name: "Test Hotel",
          check_in: "2027-05-10",
          check_out: "2027-05-12",
          rooms: 1,
          total_price: "2000.00",
          payment_status: "pending",
          created_at: new Date("2026-10-20T12:00:00.000Z"),
          cancelled_at: null
        }] };
      }
    }
  });

  const result = await bookings.listForUser("user-123");

  assert.deepEqual(query.values, ["user-123"]);
  assert.match(query.sql, /booking\.user_id = \$1/);
  assert.deepEqual(result, [{
    reference: "CS-ABC123DEF456",
    hotelName: "Test Hotel",
    checkIn: "2027-05-10",
    checkOut: "2027-05-12",
    rooms: 1,
    totalPrice: 2000,
    paymentStatus: "pending",
    createdAt: "2026-10-20T12:00:00.000Z",
    cancelledAt: null
  }]);
});

test("reservation calculates its server-side total and commits within a transaction", async () => {
  const mock = mockBookingPool({ capacity: 5, booked: 1 });
  const bookings = createBookingService({ pool: mock.pool });
  const stay = futureStay();

  const result = await bookings.createBooking({
    hotelId: "42",
    userId: "user-123",
    ...stay,
    rooms: 2,
    guestName: "  Cebu   Guest ",
    guestEmail: "GUEST@EXAMPLE.COM"
  });

  assert.equal(result.hotelName, "Test Hotel");
  assert.equal(result.rooms, 2);
  assert.equal(result.totalPrice, 4000);
  assert.equal(result.paymentStatus, "pending");
  assert.match(result.reference, /^CS-[A-F0-9]{12}$/);
  assert.equal(mock.committed, true);
  assert.equal(mock.rolledBack, false);
  assert.match(mock.queries[2].sql, /FOR UPDATE OF inventory/);
  assert.equal(mock.bookingInsert[3], "user-123");
  assert.equal(mock.bookingInsert[4], "Cebu Guest");
  assert.equal(mock.bookingInsert[5], "guest@example.com");
  assert.equal(mock.bookingInsert[9], 4000);
});

test("pending payment queue returns only unpaid reservations for developer review", async () => {
  let query;
  const bookings = createBookingService({
    pool: {
      query: async sql => {
        query = sql;
        return { rows: [{
          reference: "CS-ABC123DEF456",
          hotel_name: "Test Hotel",
          guest_name: "Cebu Guest",
          guest_email: "guest@example.com",
          check_in: "2027-05-10",
          check_out: "2027-05-12",
          rooms: 1,
          total_price: "2000.00",
          created_at: new Date("2026-10-20T12:00:00.000Z")
        }] };
      }
    }
  });

  const result = await bookings.listPendingPayments();

  assert.match(query, /payment_status = 'pending'/);
  assert.match(query, /cancelled_at IS NULL/);
  assert.deepEqual(result, [{
    reference: "CS-ABC123DEF456",
    hotelName: "Test Hotel",
    guestName: "Cebu Guest",
    guestEmail: "guest@example.com",
    checkIn: "2027-05-10",
    checkOut: "2027-05-12",
    rooms: 1,
    totalPrice: 2000,
    createdAt: "2026-10-20T12:00:00.000Z"
  }]);
});

test("payment confirmation atomically changes only pending reservations to paid", async () => {
  let query;
  let values;
  const paidAt = new Date("2026-10-21T12:00:00.000Z");
  const bookings = createBookingService({
    pool: {
      query: async (sql, params = []) => {
        query = sql;
        values = params;
        return {
          rows: [{
            reference: "CS-ABC123DEF456",
            payment_status: "paid",
            paid_at: paidAt
          }]
        };
      }
    }
  });

  const result = await bookings.confirmPayment("CS-ABC123DEF456");

  assert.match(query, /payment_status = 'paid', paid_at = now\(\)/);
  assert.match(query, /payment_status = 'pending'/);
  assert.deepEqual(values, ["CS-ABC123DEF456"]);
  assert.deepEqual(result, {
    reference: "CS-ABC123DEF456",
    paymentStatus: "paid",
    paidAt: paidAt.toISOString()
  });
});

test("payment confirmation rejects malformed references and already paid reservations", async () => {
  let queryCount = 0;
  const bookings = createBookingService({
    pool: {
      query: async () => {
        queryCount += 1;
        return { rows: queryCount === 1 ? [] : [{ payment_status: "paid", cancelled_at: null }] };
      }
    }
  });

  await assert.rejects(
    bookings.confirmPayment("not-a-reference"),
    { code: "INVALID_REFERENCE", status: 400 }
  );
  assert.equal(queryCount, 0);

  await assert.rejects(
    bookings.confirmPayment("CS-ABC123DEF456"),
    { code: "PAYMENT_ALREADY_CONFIRMED", status: 409 }
  );
  assert.equal(queryCount, 2);
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
