# BanterBox

A real-time room based chat application built with Node.js, Express, Socket.IO, and MongoDB. This application allows users to join different chat rooms and communicate instantly.

## Features

- **Real-time Messaging:** Instant message exchange between users in the same room.
- **Room-Based Chat:** Users can join specific chat rooms (e.g., `general`, `coding`, `random`).
- **Username & Room Normalization:** Usernames and room names are converted to lowercase for consistency, treating "General" and "general" as the same room.
- **Online User List:** Displays a list of users currently active in the joined chat room.
- **Typing Indicator:** Shows when another user in the room is actively typing a message.
- **Message Persistence:** All chat messages are stored in a MongoDB database and loaded as chat history when a user joins a room.
- **Modular Architecture:** Backend uses an MVC-like structure for better organization.
- **Basic Styling:** Styled using raw CSS for a clean, functional interface.

## Technologies Used

- **Backend:** Node.js, Express.js
- **Real-time:** Socket.IO
- **Database:** MongoDB (with Mongoose ORM)
- **Frontend:** HTML, CSS, JavaScript,
- **Styling:** Tailwind CSS (via CDN)

## Setup and Running the Application

Follow these steps to get the chat application up and running on your local machine.

### Prerequisites

- Node.js (LTS version recommended)
- MongoDB instance (local or cloud-based like MongoDB Atlas)
- Git (for cloning the repository)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <YOUR_REPOSITORY_URL>
    cd <YOUR_REPOSITORY_NAME>
    ```

    (Replace `<YOUR_REPOSITORY_URL>` and `<YOUR_REPOSITORY_NAME>` with your actual GitHub repository URL and name.)

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

### Configuration

1.  **Create a `.env` file:**
    In the root directory of the project, create a file named `.env`.

2.  **Add environment variables to `.env`:**
    ```
    PORT=3000
    MONGODB_URI=mongodb+srv://<dbuser>:<dbpassword>@<clustername>.mongodb.net/<databaseName>?retryWrites=true&w=majority
    ```
    **Important:** Replace `<dbuser>`, `<dbpassword>`, `<clustername>`, and `<databaseName>` with your actual MongoDB Atlas credentials. If you are using a local MongoDB instance, your `MONGODB_URI` might be `mongodb://localhost:27017/chatdb`.

### Running the Application

1.  **Start the Node.js server:**

    ```bash
    node app.js
    ```

    You should see messages like "MongoDB connected successfully!" and "Server running on port 3000" in your terminal.

2.  **Open in browser:**
    Navigate to `http://localhost:3000` in your web browser.

3.  **Interact with the chat:**
    You will be prompted to enter a username and room name. Open multiple browser tabs/windows to test real-time messaging and the typing indicator.
