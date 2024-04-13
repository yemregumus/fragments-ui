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
  const expandBtn = document.querySelector("#expand");
  const expandBtn2 = document.querySelector("#expand2");
  const uiElements = document.querySelector("#uiElements");
  const apiUrl = process.env.API_URL || "http://ec2-18-234-238-105.compute-1.amazonaws.com:8080";
  const convertTextId = document.querySelector("#fragIdTextConversation");
  const convertTextBtn = document.querySelector("#convertBtn");
  const convertImgBtn = document.querySelector("#convertImgBtn");
  const imageType = document.querySelector("#convertImgSelect");
  const fragIdImg = document.querySelector("#fragIdImg");

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
    uiElements.style.display = "none";
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
        alert("Posted image as a fragment");
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
            console.log("Got user fragments metadata", { data });
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
            console.log("Got user fragments metadata", { data });
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
          console.log("Got user fragments metadata", { data });
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

  convertTextBtn.onclick = async () => {
    console.log("Converting text fragment...");
    const convertTextIdValue = convertTextId.value;
    const convertTextTypeValue = convertTextTypeSelect.value;
    try {
      const res = await fetch(`${apiUrl}/v1/fragments/${convertTextIdValue}`, {
        // Generate headers with the proper Authorization bearer token to pass
        headers: user.authorizationHeaders(),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      // Convert the text based on the selected type
      let convertedText;
      const data = await res.text();
      if (convertTextTypeValue === "text/markdown") {
        // Convert to Markdown
        convertedText = converter.makeMarkdown(data);
      } else if (convertTextTypeValue === "text/html") {
        // Convert to HTML
        convertedText = converter.makeHtml(data);
      } else if (convertTextTypeValue === "application/json") {
        // Convert to JSON
        convertedText = JSON.stringify({ text: data });
      } else {
        // If the selected type is plain text or plain text with charset
        // Do nothing, keep the original text
        convertedText = data;
      }

      // PUT the converted fragment
      const putRes = await fetch(`${apiUrl}/v1/fragments/${convertTextIdValue}`, {
        method: "PUT",
        body: convertedText,
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
          "Content-Type": convertTextTypeValue,
        },
      });
      if (!putRes.ok) {
        throw new Error(`${putRes.status} ${putRes.statusText}`);
      }
      console.log("Converted and updated text fragment successfully", convertedText);
      alert("Converted and updated text fragment successfully");
    } catch (err) {
      console.error("Unable to convert and update text fragment:", err);
      alert("Unable to convert and update text fragment: " + err);
    }
  };

  convertImgBtn.onclick = async () => {
    const imageId = fragIdImg.value;
    const type = imageType.value;

    console.log("Converting image fragment...");

    console.log("Fragment ID:", imageId);
    console.log("Conversion Type:", type);

    try {
      const imageId = fragIdImg.value;
      const type = imageType.value;
      const res = await fetch(`${apiUrl}/v1/fragments/${imageId}`, {
        headers: user.authorizationHeaders(),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      // Convert the image based on the selected type
      const blobData = await res.blob();
      const convertedBlob = await convertImageToType(blobData, type);

      // PUT the converted fragment
      const putRes = await fetch(`${apiUrl}/v1/fragments/${imageId}`, {
        method: "PUT",
        body: convertedBlob,
        headers: {
          Authorization: user.authorizationHeaders().Authorization,
          "Content-Type": type,
        },
      });
      if (!putRes.ok) {
        throw new Error(`${putRes.status} ${putRes.statusText}`);
      }

      console.log("Converted and updated image fragment successfully");
      alert("Converted and updated image fragment successfully");
    } catch (err) {
      console.error("Unable to convert and update image fragment:", err);
      //alert("Unable to convert and update image fragment: " + err);
    }
  };

  // Function to convert image blob to the specified type
  async function convertImageToType(imageBlob, conversionType) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (event) {
        const img = new Image();

        img.onload = function () {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, conversionType);
        };

        img.onerror = function () {
          reject(new Error("Error loading image"));
        };

        img.src = event.target.result;
      };

      reader.onerror = function () {
        reject(new Error("Error reading blob data"));
      };

      reader.readAsDataURL(imageBlob);
    });
  }
}

addEventListener("DOMContentLoaded", init);
