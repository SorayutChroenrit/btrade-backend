test("TEST LOGIN STATUS AND MSG", async () => {
  const response = await fetch("http://localhost:20000/api/v1/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "JohnDoe@example.com",
      password: "securePassword123",
    }),
  });

  const responseData = await response.json();

  expect(response.status).toBe(200);
  expect(responseData.message).toBe("Login successful");
});
