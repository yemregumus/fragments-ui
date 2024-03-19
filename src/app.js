import { Auth, getUser } from "./auth";
import { html_beautify } from "js-beautify";
import showdown from "showdown";
import { getUserFragments, getUserFragmentsExpanded } from "./api";

async function init() {
  // Get our UI elements
  const userSection = document.querySelector("#user");
  const loginBtn = document.querySelector("#login");
  const logoutBtn = document.querySelector("#logout");
  const formSection = document.querySelector("section nav form");
  const postTpBtn = document.querySelector("#postTpBtn");
  const textfield = document.querySelector("#textfield");
  const contentTypeSelect = document.querySelector("#contentTypeSelect");
  const fragmentListContainerSection = document.querySelector("#fragmentListContainerSection");
  const apiUrl = process.env.API_URL || "http://localhost:8080";

  // Check if the user is already authenticated
  const user = await getUser();
  // Create a new instance of Showdown converter
  const converter = new showdown.Converter();

  // Wire up event handlers to deal with login and logout
  loginBtn.onclick = () => {
    Auth.federatedSignIn();
  };
  logoutBtn.onclick = () => {
    Auth.signOut();
  };

  if (!user) {
    // If the user is not authenticated, disable the Logout button and hide other UI elements
    logoutBtn.disabled = true;
    formSection.style.display = "none";
    postTpBtn.style.display = "none";
    contentTypeSelect.style.display = "none";
    fragmentListContainerSection.style.display = "none";
    return;
  }

  // If the user is authenticated, update the UI to welcome the user
  userSection.hidden = false;
  userSection.querySelector(".username").innerText = user.username;
  loginBtn.disabled = true;

  // Do an authenticated request to the fragments API server and log the result
  getUserFragments(user);

  // Fetch user fragments with metadata after successful login
  try {
    const fragmentsData = await getUserFragmentsExpanded(user);
    // Update UI to display fragments and metadata
    displayFragments(fragmentsData.fragments);
  } catch (error) {
    console.error("Error fetching user fragments:", error);
  }

  // Show the form and button if user is logged in
  formSection.style.display = "block";
  postTpBtn.style.display = "block";

  // Event handler for posting fragments
  postTpBtn.onclick = async () => {
    console.log("POST fragments data...");
    const selectedContentType = contentTypeSelect.value;
    // Prepare the data based on the selected content type
    let postData = textfield.value;
    if (selectedContentType === "application/json") {
      postData = JSON.stringify(JSON.parse(textfield.value), null, 2);
    } else if (selectedContentType === "text/markdown") {
      postData = converter.makeHtml(textfield.value);
    } else if (selectedContentType === "text/html") {
      postData = html_beautify(textfield.value, { indent_size: 2 });
    }
    try {
      // Make a POST request to the API endpoint
      const res = await fetch(`${apiUrl}/v1/fragments`, {
        method: "POST",
        body: postData,
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
          "Content-Type": selectedContentType,
        },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      // After successful posting, fetch fragments again to update UI
      const fragmentsData = await getUserFragmentsExpanded(user);
      // Update UI to display fragments and metadata
      displayFragments(fragmentsData.fragments);
      console.log("Posted user fragments data");
    } catch (err) {
      console.error("Unable to POST to /v1/fragment", err);
    }
  };
}

// Function to display fragments and their metadata in the UI
function displayFragments(fragments) {
  const fragmentList = document.getElementById("fragmentList");

  // Clear existing fragment list
  fragmentList.innerHTML = "";

  // Reverse the order of the fragments array to show the newest one first
  fragments.reverse();

  // Loop through each fragment and create a fragment item
  fragments.forEach((fragment) => {
    const fragmentItem = document.createElement("li");
    fragmentItem.classList.add("fragment-item");

    // Create HTML content for the fragment item
    fragmentItem.innerHTML = `
      <div class="metadata">
        <p>Created: ${fragment.created}</p>
        <p>Type: ${fragment.type}</p>
        <p>Size: ${fragment.size}</p>
      </div>
    `;

    // Append the fragment item to the fragment list
    fragmentList.appendChild(fragmentItem);
  });
}

// Wait for the DOM to be ready, then start the app
addEventListener("DOMContentLoaded", init);
