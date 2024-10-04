// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAFbGIM1MhweuOwEFbNmEQFrgpwSw2uku4",
    authDomain: "awesome-upload.firebaseapp.com",
    projectId: "awesome-upload",
    storageBucket: "awesome-upload.appspot.com",
    messagingSenderId: "189600561345",
    appId: "1:189600561345:web:73c37eb46eee211f457c40",
    measurementId: "G-D1ZY3MJDM3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const functions = firebase.functions();
const storage = firebase.storage();

const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');
const sendButton = document.getElementById('send-button');
const fileUploadLabel = document.querySelector('.custom-file-upload');

let messages = [];

// Create SVG for progress ring
const svgNS = "http://www.w3.org/2000/svg";
const progressRing = document.createElementNS(svgNS, "svg");
progressRing.setAttribute("class", "progress-ring");
progressRing.setAttribute("width", "24");
progressRing.setAttribute("height", "24");

const circle = document.createElementNS(svgNS, "circle");
circle.setAttribute("class", "progress-ring__circle");
circle.setAttribute("stroke", "#4CAF50");
circle.setAttribute("stroke-width", "2");
circle.setAttribute("fill", "transparent");
circle.setAttribute("r", "10");
circle.setAttribute("cx", "12");
circle.setAttribute("cy", "12");

progressRing.appendChild(circle);

const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - percent / 100 * circumference;
    circle.style.strokeDashoffset = offset;
}

chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = userInput.value.trim();
    const file = fileInput.files[0];
    if (!input && !file) return;

    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    let fileUrl = '';
    if (file) {
        const storageRef = storage.ref('videos/' + file.name);
        const uploadTask = storageRef.put(file);

        // Replace file upload button with progress ring
        fileUploadLabel.style.display = 'none';
        fileUploadLabel.insertAdjacentElement('afterend', progressRing);

        uploadTask.on('state_changed', 
            function progress(snapshot) {
                const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(percentage);
            }, 
            function error(err) {
                showError('Upload failed.');
                resetUploadUI();
            }, 
            async function complete() {
                fileUrl = await storageRef.getDownloadURL();
                resetUploadUI();
                proceedAfterUpload(fileUrl);
            }
        );
    } else {
        proceedAfterUpload(fileUrl);
    }
});

function resetUploadUI() {
    progressRing.remove();
    fileUploadLabel.style.display = 'inline';
    fileInput.value = '';
}

function proceedAfterUpload(fileUrl) {
    // Display user's message immediately
    addMessage('user', userInput.value.trim(), fileUrl);

    const chatFunction = functions.httpsCallable('chat', { timeout: 540000 });
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message assistant typing';
    typingIndicator.textContent = 'Assistant is typing...';
    chatContainer.appendChild(typingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    chatFunction({ messages: messages })
        .then(result => {
            // Remove typing indicator
            chatContainer.removeChild(typingIndicator);

            // Display assistant's reply
            addMessage('assistant', result.data.response);

            userInput.value = '';
            fileInput.value = '';
        })
        .catch(error => {
            console.error("Error calling Cloud Function:", error);
            showError('Error: ' + error.message);
            // Remove typing indicator
            chatContainer.removeChild(typingIndicator);
        })
        .finally(() => {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        });
}

function addMessage(role, content, fileUrl = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentArray = [];

    if (fileUrl && role === 'user') {
        const video = document.createElement('video');
        video.src = fileUrl;
        video.controls = true;
        video.width = 200;
        messageDiv.appendChild(video);

        contentArray.push({ "type": "video", "video": fileUrl });
    }

    const textP = document.createElement('p');
    textP.textContent = content;
    messageDiv.appendChild(textP);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    const currentTime = new Date();
    timeSpan.textContent = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timeSpan);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    contentArray.push({ "type": "text", "text": content });

    messages.push({ "role": role, "content": contentArray });
}

function clearChat() {
    chatContainer.innerHTML = '';
    messages = [];
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 3000);
}

// Send message on Enter key press
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendButton.click();
    }
});

// Add event listener for file input change
fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        fileUploadLabel.textContent = '📁'; // Change icon to indicate file selected
    } else {
        fileUploadLabel.textContent = '📎'; // Reset icon if no file selected
    }
});