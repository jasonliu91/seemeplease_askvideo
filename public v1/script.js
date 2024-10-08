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

document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileUploadLabel = document.querySelector('.custom-file-upload');

    let messages = [];

    // Create progress ring
    const progressRing = document.createElement('div');
    progressRing.className = 'progress-ring';
    progressRing.innerHTML = `
        <svg width="24" height="24">
            <circle class="progress-ring__background" stroke-width="3" r="10" cx="12" cy="12"/>
            <circle class="progress-ring__progress" stroke-width="3" r="10" cx="12" cy="12"/>
            <text class="progress-ring__text" x="12" y="12" dy=".35em">0%</text>
        </svg>
    `;
    fileUploadLabel.parentNode.insertBefore(progressRing, fileUploadLabel.nextSibling);

    const progressCircle = progressRing.querySelector('.progress-ring__progress');
    const progressText = progressRing.querySelector('.progress-ring__text');
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        const offset = circumference - percent / 100 * circumference;
        progressCircle.style.strokeDashoffset = offset;
        progressText.textContent = `${Math.round(percent)}%`;
    }

    function updateUIState(isSending) {
        if (isSending) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending';
            sendButton.classList.add('sending');
            fileUploadLabel.style.display = 'none';
        } else {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
            sendButton.classList.remove('sending');
            fileUploadLabel.style.display = 'inline';
            fileUploadLabel.textContent = '📎'; // Reset to initial state
            fileInput.value = ''; // Clear file input
        }
    }

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileUploadLabel.textContent = '📁'; // Change icon to indicate file selected
        } else {
            fileUploadLabel.textContent = '📎'; // Reset icon if no file selected
        }
    });

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const input = userInput.value.trim();
        const file = fileInput.files[0];
        if (!input && !file) return;

        updateUIState(true); // Set UI to sending state

        let fileUrl = '';
        if (file) {
            // Show progress ring
            progressRing.style.display = 'block';
            setProgress(0); // Initialize progress to 0

            const storageRef = storage.ref('videos/' + file.name);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed', 
                function progress(snapshot) {
                    const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(percentage);
                }, 
                function error(err) {
                    showError('Upload failed.');
                    resetUploadUI();
                    updateUIState(false);
                }, 
                async function complete() {
                    fileUrl = await storageRef.getDownloadURL();
                    resetUploadUI();
                    proceedAfterUpload(input, fileUrl);
                }
            );
        } else {
            proceedAfterUpload(input, fileUrl);
        }
    });

    function resetUploadUI() {
        progressRing.style.display = 'none';
        fileInput.value = '';
        fileUploadLabel.textContent = '📎'; // Ensure icon is reset here as well
    }

    function proceedAfterUpload(input, fileUrl) {
        // Display user's message immediately
        addMessage('user', input, fileUrl);

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
            })
            .catch(error => {
                console.error("Error calling Cloud Function:", error);
                showError('Error: ' + error.message);
                // Remove typing indicator
                chatContainer.removeChild(typingIndicator);
            })
            .finally(() => {
                updateUIState(false); // Reset UI state after sending
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
});