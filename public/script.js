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

let messages = [];

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

        // Show upload progress (optional)
        uploadTask.on('state_changed', 
            function progress(snapshot) {
                const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                sendButton.textContent = `Uploading ${Math.round(percentage)}%`;
            }, 
            function error(err) {
                showError('Upload failed.');
            }, 
            async function complete() {
                fileUrl = await storageRef.getDownloadURL();
                proceedAfterUpload(fileUrl);
            }
        );
    } else {
        proceedAfterUpload(fileUrl);
    }

    function proceedAfterUpload(fileUrl) {
        // Display user's message immediately
        addMessage('user', input, fileUrl);

        const chatFunction = functions.httpsCallable('chat',{ timeout: 540000});
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
});

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
