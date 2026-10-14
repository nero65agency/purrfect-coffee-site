import { defineConfig } from "tinacms";

// Netlify sets HEAD to the branch being built.
const branch = process.env.HEAD || "main";

// Single-document collections: Louise edits the one file, and can't add or delete copies.
const singleDoc = { allowedActions: { create: false, delete: false } };

const timeHelp = "24-hour time, e.g. 09:00";

export default defineConfig({
  branch,
  clientId: process.env.PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,

  build: { outputFolder: "admin", publicFolder: "public" },
  media: { tina: { mediaRoot: "uploads", publicFolder: "public" } },

  schema: {
    collections: [
      // ---------- Café details ----------
      {
        name: "settings",
        label: "Café details",
        path: "content/settings",
        format: "json",
        match: { include: "site" },
        ui: singleDoc,
        fields: [
          { type: "string", name: "phone", label: "Phone number" },
          { type: "string", name: "email", label: "Email address" },
          { type: "string", name: "address", label: "Address" },
          { type: "string", name: "facebookUrl", label: "Facebook page link" },
          { type: "string", name: "googleReviewUrl", label: "Google review link" },
          {
            type: "string",
            name: "topBar",
            label: "Top bar messages",
            list: true,
            description: "Short messages that run along the top of the site.",
          },
          {
            type: "object",
            name: "entry",
            label: "Entry prices",
            fields: [
              { type: "string", name: "weekday", label: "Monday to Friday" },
              { type: "string", name: "saturday", label: "Saturday" },
              { type: "string", name: "sunday", label: "Sunday" },
            ],
          },
          {
            type: "object",
            name: "rules",
            label: "Booking rules",
            fields: [
              { type: "number", name: "maxGuests", label: "Most guests per hour", description: "Including children." },
              { type: "number", name: "maxChildren", label: "Most children per hour" },
              {
                type: "string",
                name: "payment",
                label: "How people pay",
                options: ["Pay on arrival", "Pay online when booking"],
              },
              { type: "number", name: "minAge", label: "Youngest age allowed" },
              {
                type: "string",
                name: "rescheduling",
                label: "Rescheduling policy",
                ui: { component: "textarea" },
              },
            ],
          },
          { type: "string", name: "parking", label: "Parking", ui: { component: "textarea" } },
          { type: "string", name: "access", label: "Access", ui: { component: "textarea" } },
          {
            type: "object",
            name: "sponsorship",
            label: "Sponsorship",
            fields: [
              {
                type: "string",
                name: "billing",
                label: "Monthly or one-off?",
                options: ["Monthly", "One-off"],
              },
              {
                type: "object",
                name: "tiers",
                label: "Levels",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name }) },
                fields: [
                  { type: "string", name: "name", label: "Name" },
                  { type: "string", name: "price", label: "Price" },
                  { type: "string", name: "blurb", label: "Short line" },
                ],
              },
            ],
          },
        ],
      },

      // ---------- Opening hours ----------
      {
        name: "hours",
        label: "Opening hours",
        path: "content/hours",
        format: "json",
        match: { include: "hours" },
        ui: singleDoc,
        fields: [
          {
            type: "object",
            name: "days",
            label: "Days",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.day }) },
            fields: [
              {
                type: "string",
                name: "day",
                label: "Day",
                options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              },
              { type: "boolean", name: "closed", label: "Closed all day" },
              { type: "string", name: "open", label: "Opens", description: timeHelp },
              { type: "string", name: "close", label: "Closes", description: timeHelp },
              { type: "string", name: "lastBooking", label: "Last booking", description: timeHelp },
              {
                type: "string",
                name: "special",
                label: "What's special that day",
                ui: { component: "textarea" },
              },
            ],
          },
          {
            type: "string",
            name: "note",
            label: "Special notice",
            description: "e.g. Closed Boxing Day. Leave empty to hide.",
          },
        ],
      },

      // ---------- Cats ----------
      {
        name: "cats",
        label: "Meet the cats",
        path: "content/cats",
        format: "json",
        fields: [
          { type: "string", name: "name", label: "Name", isTitle: true, required: true },
          { type: "string", name: "pronoun", label: "He or she", options: ["He", "She"] },
          { type: "string", name: "bio", label: "Personality", ui: { component: "textarea" } },
          { type: "image", name: "photo", label: "Photo" },
          {
            type: "string",
            name: "photoAlt",
            label: "Photo description",
            description: "For screen readers, e.g. Luna, a black cat with a white chest.",
          },
          {
            type: "string",
            name: "photoPosition",
            label: "Photo crop",
            description: "Which part of the photo to keep in view, e.g. center 40%. Leave as it is if unsure.",
          },
          { type: "number", name: "order", label: "Position on the page", description: "1 shows first." },
        ],
      },

      // ---------- Menu ----------
      {
        name: "menu",
        label: "Menu",
        path: "content/menu",
        format: "json",
        fields: [
          { type: "string", name: "itemName", label: "Item", isTitle: true, required: true },
          {
            type: "string",
            name: "category",
            label: "Section",
            options: ["Drinks", "Sandwiches and wraps", "Light bites", "Cakes and treats"],
          },
          { type: "string", name: "price", label: "Price", description: "e.g. £3.50" },
          { type: "string", name: "description", label: "Description", ui: { component: "textarea" } },
          {
            type: "string",
            name: "options",
            label: "Flavours or fillings",
            list: true,
            description: "Optional. e.g. each cheesecake flavour.",
          },
          { type: "number", name: "order", label: "Position in section" },
        ],
      },

      // ---------- What's on ----------
      {
        name: "events",
        label: "What's on",
        path: "content/events",
        format: "json",
        fields: [
          { type: "string", name: "title", label: "Name", isTitle: true, required: true },
          { type: "string", name: "when", label: "When", description: "e.g. Every Wednesday, 17:00 – 19:00" },
          { type: "string", name: "description", label: "Details and price", ui: { component: "textarea" } },
          { type: "image", name: "image", label: "Photo" },
          { type: "boolean", name: "bookable", label: "Show a Book button" },
          { type: "boolean", name: "hidden", label: "Hide from the site" },
          { type: "number", name: "order", label: "Position on the page" },
        ],
      },

      // ---------- Reviews ----------
      {
        name: "reviews",
        label: "Reviews",
        path: "content/reviews",
        format: "json",
        fields: [
          { type: "string", name: "author", label: "Name", isTitle: true, required: true },
          { type: "string", name: "source", label: "Where", options: ["Google", "Facebook"] },
          { type: "string", name: "quote", label: "Review", ui: { component: "textarea" } },
          { type: "number", name: "rating", label: "Stars (1 to 5)" },
          { type: "number", name: "order", label: "Position on the page" },
        ],
      },
    ],
  },
});
