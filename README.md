
# A Gift For You - Digital Gift Platform

Create and share beautiful, personalized digital gift pages for friends and family. This application provides a warm and easy-to-use interface to build a lasting message and share memories, all without needing an account. It is built as a single-page application using React and Tailwind CSS, with data persisted via a serverless backend on Cloudflare.

## Features

- **No Account Needed:** Create gifts instantly without registration.
- **Elegant & Heartfelt UI:** A beautiful design with a warm color palette and elegant typography.
- **Create & Customize:** Add a recipient's name, a personal message, and up to 3 photos to create a unique gift page.
- **The "Unwrapping" Experience:** Recipients get a special animation of the gift being unwrapped before they see the message.
- **Automatic & Custom Codes:** Let the app generate a unique code for your gift, or create your own for easy recall.
- **Local History:** Gifts you create or visit are saved in your browser for quick access.
- **Easy Recovery:** Access any gift page directly using its unique code.
- **Fully Responsive:** Works beautifully on desktops, tablets, and mobile devices.

## Tech Stack

- **Frontend:** React, React Router
- **Backend:** Cloudflare Workers, R2 (for images), KV (for data)
- **AI Assist:** OpenAI API (proxied through a Node.js server)
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

---

## Getting Started (Local Development)

To run this project on your local machine, follow the steps outlined in the `DEPLOYMENT.md` file, as the frontend requires the backend services to be available. The local development server can be started with:

```bash
# From the project root
npm install
npm run dev
```

This will start the Vite development server, typically at `http://localhost:5173`.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production to the `dist` folder.
-   `npm run preview`: Serves the production build locally to preview it before deployment.

---

For deployment instructions, please see the `DEPLOYMENT.md` file.
