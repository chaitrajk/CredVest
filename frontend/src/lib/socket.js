import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // Make sure this matches your backend URL

socket.on("balanceUpdated", (data) => {
  console.log("Balance updated:", data);
  // Trigger a UI update, e.g. update balance directly in the component
});

export default socket;
