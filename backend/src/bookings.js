import { randomBytes, randomUUID } from "node:crypto";

const DEFAULT_ROOM_CAPACITY = 5;
const MAX_BOOKING_ROOMS = 10;
const MAX_POSTGRES_BIGINT = 9223372036854775807n;

export class BookingError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseHotelId(value) {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > MAX_POSTGRES_BIGINT
  ) {
    throw new BookingError(400, "Choose a valid property.", "INVALID_HOTEL");
  }
  return value;
}

function parseDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BookingError(400, `Enter a valid ${label} date.`, "INVALID_DATE");
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    throw new BookingError(400, `Enter a valid ${label} date.`, "INVALID_DATE");
  }
  return value;
}

function parseStay(checkInValue, checkOutValue) {
  const checkIn = parseDate(checkInValue, "check-in");
  const checkOut = parseDate(checkOutValue, "check-out");
  const today = new Date().toISOString().slice(0, 10);

  if (checkIn < today || checkOut <= checkIn) {
    throw new BookingError(
      400,
      "Check-in must be today or later, and check-out must be after check-in.",
      "INVALID_STAY"
    );
  }

  return { checkIn, checkOut };
}

function parseRooms(value) {
  const rooms = Number(value);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > MAX_BOOKING_ROOMS) {
    throw new BookingError(400, "Choose between 1 and 10 rooms.", "INVALID_ROOM_COUNT");
  }
  return rooms;
}

function parseGuestName(value) {
  if (typeof value !== "string") {
    throw new BookingError(400, "Enter the guest name.", "INVALID_GUEST_NAME");
  }
  const guestName = value.trim().replace(/\s+/g, " ");
  if (guestName.length < 2 || guestName.length > 120) {
    throw new BookingError(400, "Guest name must be 2 to 120 characters.", "INVALID_GUEST_NAME");
  }
  return guestName;
}

function parseGuestEmail(value) {
  if (
    typeof value !== "string" ||
    value.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  ) {
    throw new BookingError(400, "Enter a valid email address.", "INVALID_GUEST_EMAIL");
  }
  return value.trim().toLowerCase();
}

function dateDifference(checkIn, checkOut) {
  return (Date.parse(`${checkOut}T00:00:00.000Z`) -
    Date.parse(`${checkIn}T00:00:00.000Z`)) / 86_400_000;
}

function bookingReference() {
  return `CS-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function createBookingService({ pool }) {
  async function getAvailability(hotelIdValue, checkInValue, checkOutValue) {
    const hotelId = parseHotelId(hotelIdValue);
    const { checkIn, checkOut } = parseStay(checkInValue, checkOutValue);
    const result = await pool.query(
      `SELECT COALESCE(inventory.total_rooms, $4)::int AS total_rooms,
              COALESCE(SUM(bookings.rooms), 0)::int AS booked_rooms
       FROM public.sen AS hotel
       LEFT JOIN public.hotel_room_inventory AS inventory
         ON inventory.hotel_id = hotel.id
       LEFT JOIN public.room_bookings AS bookings
         ON bookings.hotel_id = hotel.id
        AND bookings.cancelled_at IS NULL
        AND bookings.check_in < $3::date
        AND bookings.check_out > $2::date
       WHERE hotel.id = $1
       GROUP BY inventory.total_rooms`,
      [hotelId, checkIn, checkOut, DEFAULT_ROOM_CAPACITY]
    );

    if (!result.rows[0]) {
      throw new BookingError(404, "The selected property was not found.", "HOTEL_NOT_FOUND");
    }

    const totalRooms = Number(result.rows[0].total_rooms);
    const bookedRooms = Number(result.rows[0].booked_rooms);
    return {
      totalRooms,
      bookedRooms,
      availableRooms: Math.max(0, totalRooms - bookedRooms),
      checkIn,
      checkOut
    };
  }

  async function listForUser(userId) {
    const result = await pool.query(
      `SELECT booking.booking_reference AS reference,
              hotel.name AS hotel_name,
              booking.check_in::text AS check_in,
              booking.check_out::text AS check_out,
              booking.rooms,
              booking.total_price,
              booking.payment_status,
              booking.created_at,
              booking.cancelled_at
       FROM public.room_bookings AS booking
       JOIN public.sen AS hotel ON hotel.id = booking.hotel_id
      WHERE booking.user_id = $1
       ORDER BY booking.created_at DESC
       LIMIT 100`,
          [userId]
    );

    return result.rows.map(row => ({
      reference: row.reference,
      hotelName: row.hotel_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      rooms: row.rooms,
      totalPrice: Number(row.total_price),
      paymentStatus: row.payment_status,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
      cancelledAt: row.cancelled_at instanceof Date
        ? row.cancelled_at.toISOString()
        : row.cancelled_at
    }));
  }

  async function listPendingPayments() {
    const result = await pool.query(
      `SELECT booking.booking_reference AS reference,
              hotel.name AS hotel_name,
              booking.guest_name,
              booking.guest_email,
              booking.check_in::text AS check_in,
              booking.check_out::text AS check_out,
              booking.rooms,
              booking.total_price,
              booking.created_at
       FROM public.room_bookings AS booking
       JOIN public.sen AS hotel ON hotel.id = booking.hotel_id
       WHERE booking.payment_status = 'pending'
         AND booking.cancelled_at IS NULL
       ORDER BY booking.created_at ASC
       LIMIT 100`
    );

    return result.rows.map(row => ({
      reference: row.reference,
      hotelName: row.hotel_name,
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      checkIn: row.check_in,
      checkOut: row.check_out,
      rooms: row.rooms,
      totalPrice: Number(row.total_price),
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at
    }));
  }

  async function confirmPayment(reference) {
    if (typeof reference !== "string" || !/^CS-[A-F0-9]{12}$/i.test(reference)) {
      throw new BookingError(400, "Choose a valid reservation.", "INVALID_REFERENCE");
    }
    const normalizedReference = reference.toUpperCase();

    const result = await pool.query(
      `UPDATE public.room_bookings
       SET payment_status = 'paid', paid_at = now()
       WHERE booking_reference = $1
         AND payment_status = 'pending'
         AND cancelled_at IS NULL
       RETURNING booking_reference AS reference, payment_status, paid_at`,
      [normalizedReference]
    );

    if (!result.rows[0]) {
      const existing = await pool.query(
        `SELECT payment_status, cancelled_at
         FROM public.room_bookings
         WHERE booking_reference = $1`,
        [normalizedReference]
      );
      if (!existing.rows[0] || existing.rows[0].cancelled_at) {
        throw new BookingError(404, "Pending reservation not found.", "RESERVATION_NOT_FOUND");
      }
      throw new BookingError(409, "This reservation is no longer pending payment.", "PAYMENT_ALREADY_CONFIRMED");
    }

    return {
      reference: result.rows[0].reference,
      paymentStatus: result.rows[0].payment_status,
      paidAt: result.rows[0].paid_at instanceof Date
        ? result.rows[0].paid_at.toISOString()
        : result.rows[0].paid_at
    };
  }

  async function createBooking(input) {
    const hotelId = parseHotelId(input.hotelId);
    const { checkIn, checkOut } = parseStay(input.checkIn, input.checkOut);
    const rooms = parseRooms(input.rooms);
    const guestName = parseGuestName(input.guestName);
    const guestEmail = parseGuestEmail(input.guestEmail);
    const userId = typeof input.userId === "string" ? input.userId : null;
    const client = await pool.connect();
    const id = randomUUID();
    const reference = bookingReference();
    let transactionOpen = false;

    try {
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query(
        `INSERT INTO public.hotel_room_inventory (hotel_id, total_rooms)
         SELECT id, $2 FROM public.sen WHERE id = $1
         ON CONFLICT (hotel_id) DO NOTHING`,
        [hotelId, DEFAULT_ROOM_CAPACITY]
      );

      const inventory = await client.query(
        `SELECT inventory.total_rooms, hotel.name, hotel.price
         FROM public.hotel_room_inventory AS inventory
         JOIN public.sen AS hotel ON hotel.id = inventory.hotel_id
         WHERE inventory.hotel_id = $1
         FOR UPDATE OF inventory`,
        [hotelId]
      );

      if (!inventory.rows[0]) {
        throw new BookingError(404, "The selected property was not found.", "HOTEL_NOT_FOUND");
      }

      const booked = await client.query(
        `SELECT COALESCE(SUM(rooms), 0)::int AS booked_rooms
         FROM public.room_bookings
         WHERE hotel_id = $1
           AND cancelled_at IS NULL
           AND check_in < $3::date
           AND check_out > $2::date`,
        [hotelId, checkIn, checkOut]
      );
      const totalRooms = Number(inventory.rows[0].total_rooms);
      const availableRooms = Math.max(0, totalRooms - Number(booked.rows[0].booked_rooms));

      if (rooms > availableRooms) {
        throw new BookingError(
          409,
          `Only ${availableRooms} room${availableRooms === 1 ? "" : "s"} remain for those dates.`,
          "INSUFFICIENT_ROOMS"
        );
      }

      const pricePerNight = Number(inventory.rows[0].price);
      if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
        throw new Error("Property has an invalid nightly rate.");
      }
      const totalPrice = Math.round(
        pricePerNight * dateDifference(checkIn, checkOut) * rooms * 100
      ) / 100;

      await client.query(
        `INSERT INTO public.room_bookings
          (id, booking_reference, hotel_id, user_id, guest_name, guest_email,
           check_in, check_out, rooms, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10)`,
        [id, reference, hotelId, userId, guestName, guestEmail, checkIn, checkOut, rooms, totalPrice]
      );
      await client.query("COMMIT");
      transactionOpen = false;

      return {
        reference,
        hotelName: inventory.rows[0].name,
        checkIn,
        checkOut,
        rooms,
        totalPrice,
        paymentStatus: "pending"
      };
    } catch (error) {
      if (transactionOpen) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    getAvailability,
    createBooking,
    listForUser,
    listPendingPayments,
    confirmPayment
  };
}
