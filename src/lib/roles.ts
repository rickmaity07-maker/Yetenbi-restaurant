/** Account roles. Owners run /admin, kitchen staff see /kueche, drivers see /lieferung, guests their profile. */
export type Role = "guest" | "owner" | "kitchen" | "driver";

export const ROLE_LABEL: Record<Role, string> = { guest: "Gast", owner: "Verwaltung", kitchen: "Küche", driver: "Lieferung" };

/** Where a role lands after signing in. */
export const homeFor = (role: Role) => (role === "owner" ? "/admin" : role === "kitchen" ? "/kueche" : role === "driver" ? "/lieferung" : "/profil");
