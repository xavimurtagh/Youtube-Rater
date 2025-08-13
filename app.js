// VideoRate Pro - Secure YouTube Video Rating Platform

class VideoRateProApp {
    constructor() {
        // Sample video data from provided JSON
        this.videos = [
            {
                "id": "dQw4w9WgXcQ",
                "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
                "channel": "RickAstleyVEVO", 
                "description": "The official video for Never Gonna Give You Up by Rick Astley",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
                "views": "1.4B",
                "duration": "3:32",
                "publishedAt": "2009-10-25T06:57:33Z",
                "category": "Music"
            },
            {
                "id": "9bZkp7q19f0", 
                "title": "PSY - GANGNAM STYLE(강남스타일) M/V",
                "channel": "officialpsy",
                "description": "PSY - GANGNAM STYLE(강남스타일) M/V @ https://youtu.be/9bZkp7q19f0",
                "thumbnail": "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg",
                "views": "4.8B", 
                "duration": "4:12",
                "publishedAt": "2012-07-15T08:34:30Z",
                "category": "Music"
            },
            {
                "id": "kJQP7kiw5Fk",
                "title": "Luis Fonsi - Despacito ft. Daddy Yankee", 
                "channel": "LuisFonsiVEVO",
                "description": "Despacito featuring Daddy Yankee",
                "thumbnail": "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg",
                "views": "8.1B",
                "duration": "4:41", 
                "publishedAt": "2017-01-12T16:00:07Z",
                "category": "Music"
            },
            {
                "id": "fJ9rUzIMcZQ",
                "title": "Queen - Bohemian Rhapsody (Official Music Video)",
                "channel": "Queen Official",
                "description": "Bohemian Rhapsody is a song by the British rock band Queen",
                "thumbnail": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg", 
                "views": "1.8B",
                "duration": "5:55",
                "publishedAt": "2008-08-01T13:32:11Z", 
                "category": "Music"
            }
        ];

        // Application state
        this.currentUser = null;
        this.isAuthenticated = false;
        this.filteredVideos = [...this.videos];
        this.userRatings = [];
        this.importedHistory = [];
        this.privacySettings = {
            essential: true,
            analytics: true,
            recommendations: true,
            marketing: false
        };
        this.consentGiven = false;

        // Security state
        this.sessionToken = null;
        this.csrfToken = this.generateCSRFToken();
        this.rateLimitCounter = new Map();

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.displayVideos();
                this.updateAuthState();
                // Check consent after a short delay to ensure DOM is ready
                setTimeout(() => this.checkConsentStatus(), 100);
            });
        } else {
            this.setupEventListeners();
            this.displayVideos();
            this.updateAuthState();
            setTimeout(() => this.checkConsentStatus(), 100);
        }
    }

    // Security Functions
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    validateInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, maxLength).replace(/<script.*?>.*?<\/script>/gi, '');
    }

    checkRateLimit(action) {
        const now = Date.now();
        const key = `${action}_${this.currentUser?.sub || 'anonymous'}`;
        const limit = this.rateLimitCounter.get(key) || { count: 0, resetTime: now + 60000 };
        
        if (now > limit.resetTime) {
            limit.count = 0;
            limit.resetTime = now + 60000;
        }
        
        if (limit.count >= 10) { // 10 actions per minute
            return false;
        }
        
        limit.count++;
        this.rateLimitCounter.set(key, limit);
        return true;
    }

    // Setup Event Listeners
    setupEventListeners() {
        // Consent modal - Setup immediately
        this.setupConsentModal();
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Search functionality with rate limiting
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (this.checkRateLimit('search')) {
                    this.searchVideos();
                } else {
                    this.showNotification('Rate limit exceeded. Please wait before searching again.', 'warning');
                }
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.checkRateLimit('search')) {
                    this.searchVideos();
                }
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterVideos());
        }

        // Authentication
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }

        // Rating modal
        this.setupRatingModal();

        // File upload for watch history
        const historyFile = document.getElementById('history-file');
        if (historyFile) {
            historyFile.addEventListener('change', (e) => this.handleHistoryUpload(e));
        }

        // Manual URL import
        const importUrlsBtn = document.getElementById('import-urls-btn');
        if (importUrlsBtn) {
            importUrlsBtn.addEventListener('click', () => this.importManualUrls());
        }

        // Privacy settings
        this.setupPrivacyControls();

        // Data management
        this.setupDataManagement();
    }

    setupConsentModal() {
        const consentRequired = document.getElementById('consent-required');
        const consentAnalytics = document.getElementById('consent-analytics');
        const acceptBtn = document.getElementById('accept-consent');
        const declineBtn = document.getElementById('decline-consent');

        if (consentRequired && acceptBtn) {
            // Enable/disable accept button based on required consent
            const updateAcceptButton = () => {
                acceptBtn.disabled = !consentRequired.checked;
            };
            
            consentRequired.addEventListener('change', updateAcceptButton);
            updateAcceptButton(); // Initial state
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.acceptConsent();
            });
        }

        if (declineBtn) {
            declineBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.declineConsent();
            });
        }

        // Handle modal clicks
        const consentModal = document.getElementById('consent-modal');
        if (consentModal) {
            consentModal.addEventListener('click', (e) => {
                // Don't close modal when clicking inside modal content
                if (e.target === consentModal) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    setupRatingModal() {
        const modalClose = document.getElementById('modal-close');
        const cancelRating = document.getElementById('cancel-rating');
        const submitRating = document.getElementById('submit-rating');
        
        if (modalClose) modalClose.addEventListener('click', () => this.closeRatingModal());
        if (cancelRating) cancelRating.addEventListener('click', () => this.closeRatingModal());
        if (submitRating) submitRating.addEventListener('click', () => this.submitRating());

        const ratingSlider = document.getElementById('rating-slider');
        if (ratingSlider) {
            ratingSlider.addEventListener('input', (e) => this.updateRatingDisplay(e.target.value));
        }

        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) {
            ratingModal.addEventListener('click', (e) => {
                if (e.target.id === 'rating-modal') this.closeRatingModal();
            });
        }
    }

    setupPrivacyControls() {
        const checkboxes = ['analytics', 'recommendations', 'marketing'];
        checkboxes.forEach(setting => {
            const checkbox = document.getElementById(setting);
            if (checkbox) {
                checkbox.checked = this.privacySettings[setting];
                checkbox.addEventListener('change', (e) => {
                    this.privacySettings[setting] = e.target.checked;
                    this.savePrivacySettings();
                });
            }
        });
    }

    setupDataManagement() {
        const exportBtn = document.getElementById('export-data-btn');
        const deleteRatingsBtn = document.getElementById('delete-ratings-btn');
        const deleteAccountBtn = document.getElementById('delete-account-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUserData());
        }
        
        if (deleteRatingsBtn) {
            deleteRatingsBtn.addEventListener('click', () => this.deleteAllRatings());
        }
        
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }
    }

    // Consent Management
    checkConsentStatus() {
        const consent = this.getStoredConsent();
        if (!consent) {
            this.showConsentModal();
        } else {
            this.consentGiven = true;
            this.privacySettings = { ...this.privacySettings, ...consent.settings };
            // Ensure consent modal is hidden if consent was already given
            const consentModal = document.getElementById('consent-modal');
            if (consentModal) {
                consentModal.classList.add('hidden');
            }
        }
    }

    showConsentModal() {
        const modal = document.getElementById('consent-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    acceptConsent() {
        const consentRequired = document.getElementById('consent-required');
        const consentAnalytics = document.getElementById('consent-analytics');
        
        if (!consentRequired || !consentRequired.checked) {
            this.showNotification('You must accept essential functionality to use this app.', 'error');
            return;
        }

        const consentData = {
            timestamp: new Date().toISOString(),
            essential: true,
            analytics: consentAnalytics?.checked || false,
            settings: {
                analytics: consentAnalytics?.checked || false,
                recommendations: true,
                marketing: false
            }
        };

        this.storeConsent(consentData);
        this.consentGiven = true;
        this.privacySettings = { ...this.privacySettings, ...consentData.settings };

        const modal = document.getElementById('consent-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        this.showNotification('Privacy preferences saved successfully!', 'success');
    }

    declineConsent() {
        this.showNotification('You must accept essential functionality to use this app.', 'warning');
    }

    getStoredConsent() {
        try {
            const stored = document.cookie
                .split('; ')
                .find(row => row.startsWith('videoRate_consent='));
            return stored ? JSON.parse(decodeURIComponent(stored.split('=')[1])) : null;
        } catch {
            return null;
        }
    }

    storeConsent(consentData) {
        // In production, this would be an httpOnly secure cookie
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        try {
            document.cookie = `videoRate_consent=${encodeURIComponent(JSON.stringify(consentData))}; expires=${expires.toUTCString()}; SameSite=Strict`;
        } catch (error) {
            console.warn('Could not store consent in cookie:', error);
        }
    }

    // Authentication (Simulated)
    processGoogleSignIn(response) {
        try {
            // In production, this would be validated server-side
            const payload = this.parseJWT(response.credential);
            
            this.currentUser = {
                sub: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
                verified_email: payload.email_verified
            };

            this.isAuthenticated = true;
            this.sessionToken = this.generateSessionToken();
            this.updateAuthState();
            
            this.showNotification(`Welcome, ${this.currentUser.name}!`, 'success');
            
            // Load user data
            this.loadUserRatings();
            this.updateTabAccess();
            
        } catch (error) {
            this.showNotification('Authentication failed. Please try again.', 'error');
            console.error('Auth error:', error);
        }
    }

    parseJWT(token) {
        // Simplified JWT parsing - in production, validate signature
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    generateSessionToken() {
        const array = new Uint8Array(64);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    signOut() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.userRatings = [];
        
        this.updateAuthState();
        this.updateTabAccess();
        this.switchTab('videos');
        
        // Clear session data
        this.clearSecureData();
        
        this.showNotification('Signed out successfully', 'success');
    }

    clearSecureData() {
        // Clear any sensitive data from memory
        this.userRatings = [];
        this.importedHistory = [];
        
        // In production, notify server to invalidate session
        this.revokeServerSession();
    }

    revokeServerSession() {
        // Simulated server session revocation
        console.log('Session revoked on server');
    }

    updateAuthState() {
        const signedOut = document.getElementById('signed-out-section');
        const signedIn = document.getElementById('signed-in-section');
        
        if (this.isAuthenticated && this.currentUser) {
            if (signedOut) signedOut.classList.add('hidden');
            if (signedIn) signedIn.classList.remove('hidden');
            
            // Update user info
            const userName = document.getElementById('user-name');
            const userEmail = document.getElementById('user-email');
            const userAvatar = document.getElementById('user-avatar');
            
            if (userName) userName.textContent = this.currentUser.name;
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (userAvatar) userAvatar.src = this.currentUser.picture;
        } else {
            if (signedOut) signedOut.classList.remove('hidden');
            if (signedIn) signedIn.classList.add('hidden');
        }
        
        this.updateTabAccess();
    }

    updateTabAccess() {
        const protectedTabs = ['history', 'ratings', 'privacy', 'recommendations'];
        
        protectedTabs.forEach(tabName => {
            const tabBtn = document.getElementById(`${tabName}-tab`);
            const authRequired = document.getElementById(`${tabName}-auth-required`);
            const content = document.getElementById(`${tabName}-content`);
            
            if (tabBtn) {
                tabBtn.disabled = !this.isAuthenticated;
            }
            
            if (this.isAuthenticated) {
                if (authRequired) authRequired.classList.add('hidden');
                if (content) content.classList.remove('hidden');
            } else {
                if (authRequired) authRequired.classList.remove('hidden');
                if (content) content.classList.add('hidden');
            }
        });
    }

    // Tab Management
    switchTab(tabName) {
        // Check authentication for protected tabs
        const protectedTabs = ['history', 'ratings', 'privacy', 'recommendations'];
        if (protectedTabs.includes(tabName) && !this.isAuthenticated) {
            this.showNotification('Please sign in to access this feature', 'warning');
            return;
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById(`${tabName}-tab-panel`) || document.getElementById(`${tabName}-tab`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // Load content for specific tabs
        if (tabName === 'ratings' && this.isAuthenticated) {
            this.displayUserRatings();
        }
    }

    // Video Search and Display
    searchVideos() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const searchTerm = this.validateInput(searchInput.value, 100).toLowerCase();
        
        if (searchTerm === '') {
            this.filteredVideos = [...this.videos];
        } else {
            this.filteredVideos = this.videos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                video.channel.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                video.category.toLowerCase().includes(searchTerm)
            );
        }
        
        this.filterVideos();
    }

    filterVideos() {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;
        
        const category = categoryFilter.value;
        let videosToShow = [...this.filteredVideos];

        if (category) {
            videosToShow = videosToShow.filter(video => video.category === category);
        }

        this.displayVideos(videosToShow);
    }

    displayVideos(videos = this.videos) {
        const videosGrid = document.getElementById('videos-grid');
        if (!videosGrid) return;
        
        if (videos.length === 0) {
            videosGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No videos found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        videosGrid.innerHTML = videos.map(video => {
            const userRating = this.getUserRating(video.id);
            
            return `
                <div class="video-card">
                    <div class="video-thumbnail-container">
                        <img src="${video.thumbnail}" alt="${this.escapeHtml(video.title)}" class="video-thumbnail">
                        <div class="video-duration">${video.duration}</div>
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                        <p class="video-channel">${this.escapeHtml(video.channel)}</p>
                        <div class="video-stats">
                            <span>${video.views} views</span>
                            <div class="video-rating">
                                <span class="rating-stars">⭐</span>
                                <span>Rate this video</span>
                            </div>
                        </div>
                        <div class="video-actions">
                            <button class="btn btn--primary btn--sm" onclick="window.app.openRatingModal('${video.id}')" ${!this.isAuthenticated ? 'disabled' : ''}>
                                ${userRating ? `Update (${userRating}/10)` : 'Rate Video'}
                            </button>
                            <button class="btn btn--outline btn--sm" onclick="window.app.openVideoLink('${video.id}')">
                                Watch
                            </button>
                        </div>
                        ${userRating ? `<p class="current-rating">Your rating: ${userRating}/10 ⭐</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    openVideoLink(videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }

    // Rating System
    openRatingModal(videoId) {
        if (!this.isAuthenticated) {
            this.showNotification('Please sign in to rate videos', 'warning');
            return;
        }

        if (!this.checkRateLimit('rating')) {
            this.showNotification('Rate limit exceeded. Please wait before rating again.', 'warning');
            return;
        }

        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        this.currentVideo = video;
        
        const modalTitle = document.getElementById('modal-video-title');
        const modalThumbnail = document.getElementById('modal-video-thumbnail');
        const modalChannel = document.getElementById('modal-video-channel');
        const modalDuration = document.getElementById('modal-video-duration');
        const modalCurrentRating = document.getElementById('modal-current-rating');
        const ratingSlider = document.getElementById('rating-slider');
        const ratingModal = document.getElementById('rating-modal');
        
        if (modalTitle) modalTitle.textContent = video.title;
        if (modalThumbnail) modalThumbnail.src = video.thumbnail;
        if (modalChannel) modalChannel.textContent = video.channel;
        if (modalDuration) modalDuration.textContent = video.duration;
        
        const userRating = this.getUserRating(videoId);
        if (modalCurrentRating) {
            modalCurrentRating.textContent = userRating ? `Your current rating: ${userRating}/10` : 'Not rated yet';
        }
        
        if (ratingSlider) {
            ratingSlider.value = userRating || 5;
            this.updateRatingDisplay(ratingSlider.value);
        }
        
        if (ratingModal) {
            ratingModal.classList.remove('hidden');
        }
    }

    closeRatingModal() {
        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) {
            ratingModal.classList.add('hidden');
        }
        this.currentVideo = null;
    }

    updateRatingDisplay(value) {
        const ratingValue = document.getElementById('rating-value');
        const ratingStars = document.getElementById('rating-stars');
        
        if (ratingValue) ratingValue.textContent = value;
        if (ratingStars) ratingStars.innerHTML = this.generateStars(value);
    }

    submitRating() {
        if (!this.isAuthenticated || !this.currentVideo) return;

        const ratingSlider = document.getElementById('rating-slider');
        if (!ratingSlider) return;
        
        const rating = parseInt(ratingSlider.value);
        const existingRatingIndex = this.userRatings.findIndex(r => r.videoId === this.currentVideo.id);

        const ratingData = {
            id: existingRatingIndex !== -1 ? this.userRatings[existingRatingIndex].id : this.generateRatingId(),
            userId: this.currentUser.sub,
            videoId: this.currentVideo.id,
            rating: rating,
            timestamp: new Date().toISOString(),
            source: 'manual_search'
        };

        if (existingRatingIndex !== -1) {
            this.userRatings[existingRatingIndex] = ratingData;
        } else {
            this.userRatings.push(ratingData);
        }

        this.saveUserRatings();
        this.closeRatingModal();
        this.displayVideos(this.getCurrentDisplayedVideos());
        this.displayUserRatings();
        
        this.showNotification('Rating saved successfully!', 'success');
    }

    generateRatingId() {
        return 'rating_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserRating(videoId) {
        if (!this.isAuthenticated) return null;
        const rating = this.userRatings.find(r => r.videoId === videoId);
        return rating ? rating.rating : null;
    }

    getCurrentDisplayedVideos() {
        const categoryFilter = document.getElementById('category-filter');
        const category = categoryFilter ? categoryFilter.value : '';
        
        let videosToShow = [...this.filteredVideos];
        if (category) {
            videosToShow = videosToShow.filter(video => video.category === category);
        }
        
        return videosToShow;
    }

    // Watch History Import
    handleHistoryUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            this.showNotification('Please upload a JSON file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showNotification('File too large. Maximum size is 10MB', 'error');
            return;
        }

        this.showUploadProgress();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processHistoryData(data);
            } catch (error) {
                this.showNotification('Invalid JSON file format', 'error');
                this.hideUploadProgress();
            }
        };
        
        reader.onerror = () => {
            this.showNotification('Error reading file', 'error');
            this.hideUploadProgress();
        };

        reader.readAsText(file);
    }

    showUploadProgress() {
        const progress = document.getElementById('upload-progress');
        if (progress) {
            progress.classList.remove('hidden');
            
            // Simulate progress
            const fill = progress.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = '0%';
                setTimeout(() => fill.style.width = '100%', 100);
            }
        }
    }

    hideUploadProgress() {
        const progress = document.getElementById('upload-progress');
        if (progress) {
            setTimeout(() => progress.classList.add('hidden'), 1000);
        }
    }

    processHistoryData(data) {
        try {
            // Process Google Takeout YouTube history format
            let historyItems = [];
            
            if (Array.isArray(data)) {
                historyItems = data.slice(0, 100); // Limit to first 100 items
            } else if (data.items && Array.isArray(data.items)) {
                historyItems = data.items.slice(0, 100);
            }

            const processed = historyItems
                .filter(item => item.titleUrl && item.titleUrl.includes('youtube.com/watch'))
                .map(item => ({
                    id: this.extractVideoId(item.titleUrl),
                    title: this.validateInput(item.title || 'Unknown Video', 200),
                    url: item.titleUrl,
                    watchedAt: item.time || new Date().toISOString()
                }))
                .filter(item => item.id);

            this.importedHistory = [...this.importedHistory, ...processed];
            this.displayImportedHistory();
            this.hideUploadProgress();
            
            this.showNotification(`Successfully imported ${processed.length} videos from your watch history!`, 'success');
            
        } catch (error) {
            this.showNotification('Error processing history data', 'error');
            this.hideUploadProgress();
        }
    }

    extractVideoId(url) {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    importManualUrls() {
        const textarea = document.getElementById('manual-urls');
        if (!textarea) return;

        const urls = textarea.value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && url.includes('youtube.com/watch'));

        if (urls.length === 0) {
            this.showNotification('Please enter valid YouTube URLs', 'warning');
            return;
        }

        const imported = urls.map(url => ({
            id: this.extractVideoId(url),
            title: 'Manually Added Video',
            url: url,
            watchedAt: new Date().toISOString()
        })).filter(item => item.id);

        this.importedHistory = [...this.importedHistory, ...imported];
        this.displayImportedHistory();
        textarea.value = '';
        
        this.showNotification(`Successfully imported ${imported.length} videos!`, 'success');
    }

    displayImportedHistory() {
        const historyContainer = document.getElementById('imported-history');
        if (!historyContainer) return;

        if (this.importedHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No imported history</h3>
                    <p>Upload your Google Takeout file or add URLs manually</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = `
            <h3>Imported History (${this.importedHistory.length} videos)</h3>
            <div class="history-list">
                ${this.importedHistory.slice(0, 20).map(item => `
                    <div class="history-item">
                        <img src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" alt="${this.escapeHtml(item.title)}" class="video-thumbnail">
                        <div class="history-details">
                            <h4 class="video-title">${this.escapeHtml(item.title)}</h4>
                            <p class="watch-date">Watched: ${new Date(item.watchedAt).toLocaleDateString()}</p>
                        </div>
                        <button class="btn btn--primary btn--sm" onclick="window.app.openRatingModal('${item.id}')">
                            Rate
                        </button>
                    </div>
                `).join('')}
                ${this.importedHistory.length > 20 ? '<p class="section-description">Showing first 20 videos...</p>' : ''}
            </div>
        `;
    }

    // User Ratings Display
    displayUserRatings() {
        const ratingsList = document.getElementById('user-ratings-list');
        if (!ratingsList) return;
        
        if (!this.isAuthenticated) return;

        if (this.userRatings.length === 0) {
            ratingsList.innerHTML = `
                <div class="empty-state">
                    <h3>No ratings yet</h3>
                    <p>Start rating videos to see your history here</p>
                </div>
            `;
            return;
        }

        // Update stats
        this.updateUserStats();

        const sortedRatings = [...this.userRatings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        ratingsList.innerHTML = sortedRatings.map(rating => {
            const video = this.videos.find(v => v.id === rating.videoId);
            if (!video) return '';

            const date = new Date(rating.timestamp).toLocaleDateString();
            
            return `
                <div class="rating-item">
                    <img src="${video.thumbnail}" alt="${this.escapeHtml(video.title)}" class="video-thumbnail">
                    <div class="rating-details">
                        <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                        <p class="video-channel">${this.escapeHtml(video.channel)}</p>
                        <div class="rating-date">Rated on ${date}</div>
                    </div>
                    <div class="rating-score">
                        <div class="rating-number">${rating.rating}</div>
                        <div class="stars">${this.generateStars(rating.rating)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateUserStats() {
        const totalRatings = this.userRatings.length;
        const avgRating = totalRatings > 0 ? 
            (this.userRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) : 0;

        const totalEl = document.getElementById('user-total-ratings');
        const avgEl = document.getElementById('user-avg-rating');
        
        if (totalEl) totalEl.textContent = totalRatings;
        if (avgEl) avgEl.textContent = avgRating.toFixed(1);
    }

    // Privacy and Data Management
    savePrivacySettings() {
        // In production, this would be sent to server
        this.showNotification('Privacy settings updated', 'success');
    }

    exportUserData() {
        if (!this.isAuthenticated) return;

        const exportData = {
            user: this.currentUser,
            ratings: this.userRatings,
            importedHistory: this.importedHistory,
            privacySettings: this.privacySettings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `videoRate-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
    }

    deleteAllRatings() {
        if (!this.isAuthenticated) return;

        if (confirm('Are you sure you want to delete all your ratings? This action cannot be undone.')) {
            this.userRatings = [];
            this.saveUserRatings();
            this.displayUserRatings();
            this.displayVideos(this.getCurrentDisplayedVideos());
            this.showNotification('All ratings deleted', 'success');
        }
    }

    deleteAccount() {
        if (!this.isAuthenticated) return;

        if (confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) {
            // Clear all user data
            this.userRatings = [];
            this.importedHistory = [];
            this.privacySettings = {
                essential: true,
                analytics: true,
                recommendations: true,
                marketing: false
            };
            
            // Sign out
            this.signOut();
            
            // Clear stored data
            document.cookie = 'videoRate_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            this.showNotification('Account deleted successfully', 'success');
        }
    }

    // Utility Functions
    generateStars(rating) {
        const fullStars = Math.floor(rating / 2);
        const hasHalfStar = (rating % 2) >= 1;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return '⭐'.repeat(fullStars) + 
               (hasHalfStar ? '✨' : '') + 
               '☆'.repeat(emptyStars);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Data Persistence (Simulated)
    saveUserRatings() {
        if (!this.isAuthenticated) return;
        
        // In production, this would be saved securely on the server
        const key = `videoRate_ratings_${this.currentUser.sub}`;
        try {
            document.cookie = `${key}=${encodeURIComponent(JSON.stringify(this.userRatings))}; SameSite=Strict; max-age=31536000`;
        } catch (error) {
            console.warn('Unable to save ratings locally');
        }
    }

    loadUserRatings() {
        if (!this.isAuthenticated) return;
        
        const key = `videoRate_ratings_${this.currentUser.sub}`;
        try {
            const stored = document.cookie
                .split('; ')
                .find(row => row.startsWith(`${key}=`));
            
            if (stored) {
                this.userRatings = JSON.parse(decodeURIComponent(stored.split('=')[1]));
            }
        } catch (error) {
            console.warn('Unable to load ratings');
            this.userRatings = [];
        }
    }
}

// Make handleCredentialResponse globally available for Google Sign-In
window.handleCredentialResponse = function(response) {
    if (window.app) {
        window.app.processGoogleSignIn(response);
    }
};

// Initialize the app
window.app = new VideoRateProApp();