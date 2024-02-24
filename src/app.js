// src/app.js

import { Auth, getUser } from "./auth";
import { html_beautify } from "js-beautify";
import marked from "marked";
import { getUserFragments, getUserFragmentsExpanded } from "./api";

async function init() {
  // Get our UI elements
  const userSection = document.querySelector("#user");
  const loginBtn = document.querySelector("#login");
  const logoutBtn = document.querySelector("#logout");
  const formSection = document.querySelector("section nav form ");
  const postTpBtn = document.querySelector("#postTpBtn");
  const textfield = document.querySelector("#textfield");
  const contentTypeSelect = document.querySelector("#contentTypeSelect");

  const user = await getUser();

  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
    // Sign-in via the Amazon Cognito Hosted UI (requires redirects), see:
    // https://docs.amplify.aws/lib/auth/advanced/q/platform/js/#identity-pool-federation
    Auth.federatedSignIn();
  };
  logoutBtn.onclick = () => {
    // Sign-out of the Amazon Cognito Hosted UI (requires redirects), see:
    // https://docs.amplify.aws/lib/auth/emailpassword/q/platform/js/#sign-out
    Auth.signOut();
  };

  // See if we're signed in (i.e., we'll have a `user` object)
  //const user = await getUser();
  if (!user) {
    // Disable the Logout button
    logoutBtn.disabled = true;
    formSection.style.display = "none"; // Hide the form if user is not logged in
    postTpBtn.style.display = "none";
    contentTypeSelect.style.display = "none";
    return;
  }

  // Log the user info for debugging purposes
  console.log({ user });

  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector(".username").innerText = user.username;

  // Disable the Login button
  loginBtn.disabled = true;

  // Do an authenticated request to the fragments API server and log the result
  getUserFragments(user);

  // Update the UI to welcome the user and display fragments
  userSection.hidden = false;
  userSection.querySelector(".username").innerText = user.username;
  loginBtn.disabled = true;

  // Show the form and button if user is logged in
  formSection.style.display = "block";
  postTpBtn.style.display = "block";

  const apiUrl = process.env.API_URL || "http://localhost:8080";
  // Post button
  postTpBtn.onclick = async () => {
    console.log("POST fragments data...");

    // Check the selected content type
    const selectedContentType = contentTypeSelect.value;
    if (selectedContentType === "text/markdown" || selectedContentType === "text/html" || selectedContentType === "application/json") {
      console.log(`POSTing (${selectedContentType}):`);
      if (selectedContentType === "application/json") {
        console.log(JSON.stringify(JSON.parse(textfield.value), null, 2));
      } else if (selectedContentType === "text/markdown") {
        console.log(marked(textfield.value)); // Convert Markdown to HTML and then log
      } else if (selectedContentType === "text/html") {
        console.log(html_beautify(textfield.value, { indent_size: 2 })); // Beautify HTML and then log
      }
    } else {
      console.log("POSTing: " + textfield.value);
    }
    try {
      const res = await fetch(`${apiUrl}/v1/fragments`, {
        method: "POST",
        body: textfield.value.value,
        // Generate headers with the proper Authorization bearer token to pass
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
          "Content-Type": contentTypeSelect.value,
        },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("Posted user fragments data", { data });
    } catch (err) {
      console.error("Unable to POST to /v1/fragment", { err });
    }
  };
}

// Wait for the DOM to be ready, then start the app
addEventListener("DOMContentLoaded", init);
