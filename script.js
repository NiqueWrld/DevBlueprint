// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";

fetch('config.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(config => {
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: config.firebaseConfig.apiKey,
            authDomain: config.firebaseConfig.authDomain,
            projectId: config.firebaseConfig.projectId,
            storageBucket: config.firebaseConfig.storageBucket,
            messagingSenderId: config.firebaseConfig.messagingSenderId,
            appId: config.firebaseConfig.appId
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const database = getDatabase(app);

        // Reference to your database path
        const dbRef = ref(database, 'tutorials'); // Change 'tutorials' to your actual data path if needed

        // YouTube Player API script
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Listen for data changes
        onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = ''; // Clear the content div

            const searchInput = document.getElementById('searchInput');
            const typeFilter = document.getElementById('typeFilter');

            data.forEach(tutorial => {
                const tutorialDiv = document.createElement('div');
                tutorialDiv.classList.add('tutorial');

                // Add class based on tutorial type
                if (tutorial.type === 'video') {
                    tutorialDiv.classList.add('type-video');
                    const playButton = document.createElement('div');
                    playButton.classList.add('play-button');
                    playButton.innerHTML = '&#9658;'; // Play icon

                    const duration = document.createElement('p');
                    duration.classList.add('duration');
                    duration.textContent = 'Duration: Loading...';

                    const likes = document.createElement('p');
                    likes.classList.add('likes');
                    likes.textContent = 'Likes: Loading...';

                    if (tutorial.url.includes('youtube.com')) {
                        const videoId = new URL(tutorial.url).searchParams.get('v');
                        playButton.addEventListener('click', () => {
                            const iframe = document.createElement('iframe');
                            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
                            iframe.width = '560';
                            iframe.height = '315';
                            iframe.frameBorder = '0';
                            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                            iframe.allowFullscreen = true;
                            tutorialDiv.appendChild(iframe);
                            iframe.addEventListener('load', () => {
                                const player = new YT.Player(iframe, {
                                    events: {
                                        'onReady': (event) => {
                                            event.target.playVideo();
                                        }
                                    }
                                });
                            });
                        });

                        // Get YouTube video duration and likes using YouTube Data API
                        fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,statistics&key= ${config.youtubeApiKey}`)
                            .then(response => response.json())
                            .then(data => {
                                const videoData = data.items[0];
                                const durationISO = videoData.contentDetails.duration;
                                const durationSeconds = isoDurationToSeconds(durationISO);
                                duration.textContent = `Duration: ${formatDuration(durationSeconds)}`;
                                likes.textContent = `Likes: ${videoData.statistics.likeCount}`;
                            });
                    } else {
                        playButton.addEventListener('click', () => {
                            if ('pictureInPictureEnabled' in document) {
                                const video = document.createElement('video');
                                video.src = tutorial.url;
                                video.controls = true;
                                video.autoplay = true;
                                video.setAttribute('disablePictureInPicture', false); // Disable PiP on the embedded video
                                video.style.width = '100%';
                                video.style.height = 'auto';
                                video.style.position = 'fixed';
                                video.style.bottom = '20px';
                                video.style.right = '20px';
                                video.style.zIndex = '9999';
                                document.body.appendChild(video);
                                video.requestPictureInPicture();
                            } else {
                                alert('Your browser does not support Picture-in-Picture mode.');
                            }
                        });

                        // Get regular video duration
                        const video = document.createElement('video');
                        video.src = tutorial.url;
                        video.addEventListener('loadedmetadata', () => {
                            const durationSeconds = video.duration;
                            duration.textContent = `Duration: ${formatDuration(durationSeconds)}`;
                        });
                    }
                    tutorialDiv.appendChild(duration);
                    tutorialDiv.appendChild(likes);
                    tutorialDiv.appendChild(playButton);
                }

                const title = document.createElement('h3');
                title.textContent = tutorial.title;

                const creator = document.createElement('p');
                creator.textContent = `Creator: ${tutorial.creator}`;

                const url = document.createElement('a');
                url.href = tutorial.url;
                url.textContent = 'Access here';
                url.target = '_blank'; // Open link in new tab

                tutorialDiv.appendChild(title);
                tutorialDiv.appendChild(creator);
                tutorialDiv.appendChild(url);

                contentDiv.appendChild(tutorialDiv);
            });

            // Event listeners for search and filter
            searchInput.addEventListener('input', filterTutorials);
            typeFilter.addEventListener('change', filterTutorials);

            // Function to filter tutorials based on search input and type filter
            function filterTutorials() {
                const searchValue = searchInput.value.toLowerCase();
                const selectedType = typeFilter.value;

                data.forEach((tutorial, index) => {
                    const tutorialDiv = document.querySelectorAll('.tutorial')[index];
                    const title = tutorial.title.toLowerCase();
                    const tags = tutorial.tags.map(tag => tag.toLowerCase());

                    // Check if title contains search value or tags contain search value
                    const titleMatch = title.includes(searchValue);
                    const tagMatch = tags.some(tag => tag.includes(searchValue));

                    // Check if type matches selected type or all tutorials are selected
                    const typeMatch = selectedType === 'all' || tutorial.type === selectedType;

                    if ((titleMatch || tagMatch) && typeMatch) {
                        tutorialDiv.classList.add('active');
                    } else {
                        tutorialDiv.classList.remove('active');
                    }
                });
            }

            // Show all tutorials initially
            document.querySelectorAll('.tutorial').forEach(tutorialDiv => {
                tutorialDiv.classList.add('active');
            });

            // Helper functions to format duration
            function formatDuration(seconds) {
                const hrs = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${hrs ? hrs + 'h ' : ''}${mins ? mins + 'm ' : ''}${secs ? secs + 's' : ''}`;
            }

            function isoDurationToSeconds(isoDuration) {
                const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
                const hours = (parseInt(match[1]) || 0) * 3600;
                const minutes = (parseInt(match[2]) || 0) * 60;
                const seconds = parseInt(match[3]) || 0;
                return hours + minutes + seconds;
            }
        });

    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
