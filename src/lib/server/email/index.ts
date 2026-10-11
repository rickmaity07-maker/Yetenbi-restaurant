// All emails the website sends. See send.ts for the mail server setup.
export { isMailerConfigured } from "./send";
export { notifyRestaurant, notifyRestaurantCancelled, sendGuestEmail, sendPasswordReset } from "./reservation-emails";
export { notifyRestaurantOrder, notifyStaffOrder, orderStatusUrl, sendOrderEmail } from "./order-emails";
