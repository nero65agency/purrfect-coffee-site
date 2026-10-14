import { defineConfig } from "tinacms";

const branch = process.env.HEAD || process.env.VERCEL_GIT_COMMIT_REF || "main";

export default defineConfig({
  branch,
  clientId: process.env.PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [
      {
        name: "cats",
        label: "Meet the Cats",
        path: "content/cats",
        format: "json",
        fields: [
          { type: "string", name: "name", label: "Cat Name", isTitle: true, required: true },
          { type: "string", name: "bio", label: "Short Bio / Personality" },
          { type: "image", name: "photo", label: "Cat Photo" },
        ],
      },
      {
        name: "menu",
        label: "Food & Drink Menu",
        path: "content/menu",
        format: "json",
        fields: [
          { type: "string", name: "category", label: "Category (Drinks, Cakes, Toasties)" },
          { type: "string", name: "itemName", label: "Item Name", isTitle: true, required: true },
          { type: "string", name: "price", label: "Price (e.g. £3.50)" },
          { type: "string", name: "description", label: "Description / Allergens" },
        ],
      },
      {
        name: "hours",
        label: "Opening Hours",
        path: "content/hours",
        format: "json",
        fields: [
          { type: "string", name: "days", label: "Days (e.g. Mon - Fri)", isTitle: true, required: true },
          { type: "string", name: "time", label: "Hours (e.g. 10:00 - 17:00)" },
        ],
      },
      {
        name: "reviews",
        label: "Customer Reviews",
        path: "content/reviews",
        format: "json",
        fields: [
          { type: "string", name: "author", label: "Customer Name", isTitle: true, required: true },
          { type: "string", name: "quote", label: "Review Quote", ui: { component: "textarea" } },
          { type: "number", name: "rating", label: "Rating (1-5)" },
        ],
      },
    ],
  },
});