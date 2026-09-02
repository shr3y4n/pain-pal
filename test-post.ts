import dotenv from "dotenv";
dotenv.config();

const token = process.argv[2] || "invalid-token";

async function test() {
  const res = await fetch("http://localhost:3000/api/journal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ prompt: "hello" })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
