const form = document.querySelector("form");

form.addEventListener("submit", () => {
  const tweet = document.querySelector("#tweet").value;

  fetch("/tweet/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tweet,
    }),
  })
    .then((res) => res.json())
    .then(() => alert("Posted"))
    .catch((err) => console.log(error));
});
