import { Auth, getUser } from "./auth";
import { html_beautify } from "js-beautify";
import showdown from "showdown";
import { getUserFragments, getUserFragmentsExpanded } from "./api";

async function init() {
  // Get our UI elements
  const userSection = document.querySelector("#user");
  const loginBtn = document.querySelector("#loginButton");
  const logoutBtn = document.querySelector("#logoutButton");
  const formSection = document.querySelector("section nav form");
  const postTpBtn = document.querySelector("#postTpBtn");
  const textfield = document.querySelector("#textfield");
  const delBtn = document.querySelector("#delBtn");
  const textfield2 = document.querySelector("#textfield2");
  const putBtn = document.querySelector("#putBtn");
  const contentTypeSelect = document.querySelector("#contentTypeSelect");
  const fragmentListContainerSection = document.querySelector("#fragmentListContainerSection");
  const expandBtn = document.querySelector("#expand");
  const expandBtn2 = document.querySelector("#expand2");
  const apiUrl = process.env.API_URL || "http://fragments-lb-1440859714.us-east-1.elb.amazonaws.com:80";

  // Check if the user is already authenticated
  const user = await getUser();
  // Create a new instance of Showdown converter
  const converter = new showdown.Converter();

  // Wire up event handlers to deal with login and logout
  loginButton.onclick = () => {
    Auth.federatedSignIn();
  };
  logoutButton.onclick = () => {
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
      alert("Posted user fragments data successfully");
    } catch (err) {
      console.error("Unable to POST to /v1/fragment", err);
      alert("Unable to Post to /v1/fragment: " + err);
    }
  };

  // Image upload on event listener
  const imgUpload = async (event) => {
    console.log("POST fragments data...");
    console.log(event.target.files);
    for (const file of event.target.files) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (item) => {
        const res = await fetch(`${apiUrl}/v1/fragments`, {
          method: "POST",
          body: item.target.result,
          headers: {
            // Generate headers with the proper Authorization bearer token to pass
            Authorization: user.authorizationHeaders().Authorization,
            "Content-Type": file.type,
          },
        });
        const data = await res.json();
        console.log("Posted image as a fragment", { data });
      };
    }
  };
  document.querySelector("#imageFile").addEventListener("change", imgUpload);

  // Display fragments
  expandBtn.onclick = async () => {
    console.log("Requesting user fragments data...");
    try {
      const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
        // Generate headers with the proper Authorization bearer token to pass
        headers: user.authorizationHeaders(),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("Got user fragments data", { data });
      // Loop through res fragments and fetch
      document.getElementById("displayFragments").innerHTML = "";
      for (const fragment of data.fragments) {
        try {
          const res = await fetch(`${apiUrl}/v1/fragments/${fragment.id}`, {
            // Generate headers with the proper Authorization bearer token to pass
            headers: user.authorizationHeaders(),
          });
          if (!res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
          }
          // Populate with text fragment or image fragment
          if (fragment.type.startsWith("text") || fragment.type.startsWith("application")) {
            const data = await res.text();
            document.getElementById("displayFragments").appendChild(document.createElement("hr"));
            document.getElementById("displayFragments").appendChild(document.createTextNode("Fragment id: " + fragment.id));
            document.getElementById("displayFragments").appendChild(document.createElement("br"));
            document.getElementById("displayFragments").appendChild(document.createTextNode(data));
          } else if (fragment.type.startsWith("image")) {
            const data = await res.arrayBuffer();
            const rawData = Buffer.from(data);
            const imageData = new Blob([rawData], { type: fragment.type });
            const image = new Image();
            const reader = new FileReader();
            reader.readAsDataURL(imageData);
            reader.addEventListener("load", function () {
              image.src = reader.result;
              image.alt = fragment.id;
            });
            document.getElementById("displayFragments").appendChild(document.createElement("hr"));
            document.getElementById("displayFragments").appendChild(document.createTextNode("Fragment id: " + fragment.id));
            document.getElementById("displayFragments").appendChild(document.createElement("br"));
            document.getElementById("displayFragments").appendChild(image);
          }
        } catch (err) {
          console.error("Unable to call GET /v1/fragments/:id", { err });
        }
      }
    } catch (err) {
      console.error("Unable to call GET /v1/fragment", { err });
    }
  };

  expandBtn2.onclick = async () => {
    console.log("Requesting user fragments data...");
    try {
      const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
        // Generate headers with the proper Authorization bearer token to pass
        headers: user.authorizationHeaders(),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("Got user fragments metadata", { data });
      // Loop through res fragments and fetch
      document.getElementById("displayFragments").innerHTML = "";
      for (const fragment of data.fragments) {
        try {
          const res = await fetch(`${apiUrl}/v1/fragments/${fragment.id}/info`, {
            // Generate headers with the proper Authorization bearer token to pass
            headers: user.authorizationHeaders(),
          });
          if (!res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
          }
          // Populate with fragment metadata
          const data = await res.text();
          document.getElementById("displayFragments").appendChild(document.createElement("hr"));
          document.getElementById("displayFragments").appendChild(document.createTextNode("Fragment id: " + fragment.id));
          document.getElementById("displayFragments").appendChild(document.createElement("br"));
          document.getElementById("displayFragments").appendChild(document.createTextNode(data));
        } catch (err) {
          console.error("Unable to call GET /v1/fragments/:id", { err });
        }
      }
    } catch (err) {
      console.error("Unable to call GET /v1/fragment", { err });
    }
  };

  putBtn.onclick = async () => {
    console.log("PUT fragments data...");
    console.log("PUT: " + document.querySelector("#fragId").value + " with value: " + document.querySelector("#textfield2").value);
    const modId = document.querySelector("#fragId").value;
    try {
      const res = await fetch(`${apiUrl}/v1/fragments/${modId}`, {
        method: "PUT",
        body: document.querySelector("#textfield2").value,
        // Generate headers with the proper Authorization bearer token to pass
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
        },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("PUT user fragments data", { data });
      alert("Updated fragments data successfully");
    } catch (err) {
      console.error("Unable to PUT to /v1/fragment", { err });
      alert("Unable to update fragments data: ", { err });
    }
  };

  delBtn.onclick = async () => {
    console.log("DELETE fragment");
    console.log("DELETE fragment: " + document.querySelector("#fragId").value);
    const modId = document.querySelector("#fragId").value;
    try {
      const res = await fetch(`${apiUrl}/v1/fragments/${modId}`, {
        method: "DELETE",
        // Generate headers with the proper Authorization bearer token to pass
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
        },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("DELETE user fragments data", { data });
      alert("Deleted fragments data successfully");
    } catch (err) {
      console.error("Unable to DELETE to /v1/fragment", { err });
      alert("Unable to delete fragments data: ", { err });
    }
  };

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
}

addEventListener("DOMContentLoaded", init);
