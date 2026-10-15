/**
  Account roles. Owners run /admin, kitchen staff see /kueche, drivers see /lieferung, service staff take table
  orders in the Android app (on the website: /service, where they download it), guests their profile.
*/
export type Role = "guest" | "owner" | "kitchen" | "driver" | "service";

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Gast",
  owner: "Verwaltung",
  kitchen: "Küche",
  driver: "Lieferung",
  service: "Service",
};

/** Where a role lands after signing in. */
export const homeFor = (role: Role) =>
  role === "owner"
    ? "/admin"
    : role === "kitchen"
      ? "/kueche"
      : role === "driver"
        ? "/lieferung"
        : role === "service"
          ? "/service"
          : "/profil";
