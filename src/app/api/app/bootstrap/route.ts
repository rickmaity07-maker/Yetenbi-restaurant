import { appRoute } from "@/lib/server/app-auth";
import { readMenu } from "@/lib/server/menu";
import { listTables } from "@/lib/server/service";

/*
  Everything the app needs on start and refreshes every half minute: who is signed in, the table plan and the
  menu (sold-out dishes included, marked, so the waiter sees them greyed out).
*/
export const GET = appRoute(async (_request, user) => {
  const [tables, menu] = await Promise.all([listTables(), readMenu()]);
  return {
    user,
    tables,
    categories: menu
      .filter((category) => category.items.length > 0)
      .map((category) => ({
        id: category.id,
        title: category.title,
        drinks: category.drinks,
        items: category.items.map((dish) => ({
          id: dish.id,
          name: dish.name,
          amharic: dish.amharic,
          description: dish.description,
          price: dish.price,
          tags: dish.tags,
          allergens: dish.allergens,
          available: dish.available,
        })),
      })),
    serverTime: new Date().toISOString(),
  };
});
