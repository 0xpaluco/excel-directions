class DojoMapRedirect {
    constructor() {
        this.config = window.DOJO_CONFIG || {};
        this.mapUrls = this.generateMapUrls();
        this.startTime = Date.now();
        this.init();
    }
    
    generateMapUrls() {
        const { address, lat, lng, name } = this.config;
        const encodedAddress = encodeURIComponent(address);
        const encodedName = encodeURIComponent(name);
        
        return {
            apple: `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&t=m`,
            appleFallback: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&t=m`,
            google: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&destination_place_id=${encodedName}`,
            googleApp: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
            waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`,
            wazeApp: `waze://?ll=${lat},${lng}&navigate=yes`
        };
    }
    
    init() {
        this.bindMapButtons();
        this.setupAnalytics();
        this.addAccessibilityFeatures();
        this.setupErrorHandling();
        
        // Log initialization
        console.log('🗺️ Dojo Map Redirect initialized', {
            dojo: this.config.name,
            coordinates: `${this.config.lat}, ${this.config.lng}`,
            userAgent: navigator.userAgent.substring(0, 50) + '...'
        });
        
        // Uncomment to enable auto-redirect after 5 seconds
        // setTimeout(() => this.enableAutoRedirect(), 2000);
    }
    
    bindMapButtons() {
        const buttons = document.querySelectorAll('[data-service]');
        
        buttons.forEach(button => {
            const service = button.dataset.service;
            if (service && this.mapUrls[service]) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleMapClick(service, button);
                });
                
                // Enhanced keyboard support
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleMapClick(service, button);
                    }
                });
            }
        });
    }
    
    async handleMapClick(service, buttonElement) {
        try {
            this.trackMapClick(service);
            this.showLoadingState(buttonElement);
            
            // Haptic feedback on mobile
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const success = await this.openMapApp(service);
            
            if (!success) {
                this.showError(`Unable to open ${service} maps. Please try another option.`);
            }
            
        } catch (error) {
            console.error('Map redirect error:', error);
            this.showError('Something went wrong. Please try again.');
            this.trackError(service, error);
        } finally {
            setTimeout(() => this.hideLoadingState(buttonElement), 2000);
        }
    }
    
    async openMapApp(service) {
        const urls = this.mapUrls;
        
        switch (service) {
            case 'apple':
                if (this.isIOS()) {
                    // Try native app first, fallback to web
                    return this.tryUrlWithFallback(urls.apple, urls.appleFallback);
                } else {
                    window.open(urls.appleFallback, '_blank');
                    return true;
                }
                
            case 'google':
                if (this.isMobile()) {
                    // Try native app first, fallback to web
                    return this.tryUrlWithFallback(urls.googleApp, urls.google);
                } else {
                    window.open(urls.google, '_blank');
                    return true;
                }
                
            case 'waze':
                if (this.isMobile()) {
                    // Try native app first, fallback to web
                    return this.tryUrlWithFallback(urls.wazeApp, urls.waze);
                } else {
                    window.open(urls.waze, '_blank');
                    return true;
                }
                
            default:
                return false;
        }
    }
    
    async tryUrlWithFallback(primaryUrl, fallbackUrl) {
        try {
            // Try primary URL (app)
            window.location.href = primaryUrl;
            
            // Wait a bit and check if we're still on the page
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // If still here, open fallback (web)
            if (document.hasFocus()) {
                window.open(fallbackUrl, '_blank');
            }
            
            return true;
        } catch (error) {
            // Fallback to web version
            window.open(fallbackUrl, '_blank');
            return true;
        }
    }
    
    showLoadingState(buttonElement) {
        if (buttonElement) {
            const originalContent = buttonElement.innerHTML;
            buttonElement.dataset.originalContent = originalContent;
            buttonElement.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Opening...</span>
                </div>
            `;
            buttonElement.disabled = true;
        }
        
        // Show global loading overlay
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
    
    hideLoadingState(buttonElement) {
        if (buttonElement && buttonElement.dataset.originalContent) {
            buttonElement.innerHTML = buttonElement.dataset.originalContent;
            buttonElement.disabled = false;
            delete buttonElement.dataset.originalContent;
        }
        
        // Hide global loading overlay
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg text-sm';
            errorDiv.setAttribute('role', 'alert');
            
            const buttonsContainer = document.querySelector('[role="group"]');
            if (buttonsContainer) {
                buttonsContainer.parentNode.insertBefore(errorDiv, buttonsContainer.nextSibling);
            }
        }
        
        errorDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-red-500" aria-hidden="true">⚠️</span>
                <p class="text-red-700">${message}</p>
            </div>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    trackMapClick(service) {
        const eventData = {
            map_service: service,
            event_category: 'navigation',
            event_label: 'dojo_location',
            custom_map_dojo_name: this.config.name,
            device_type: this.getDeviceType(),
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
            referrer: document.referrer
        };
        
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'map_click', eventData);
        }
        
        // Meta Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
                content_type: 'location',
                content_name: 'dojo_directions',
                ...eventData
            });
        }
        
        // Custom analytics
        this.sendCustomAnalytics('map_click', eventData);
    }
    
    trackError(service, error) {
        const errorData = {
            map_service: service,
            error_message: error.message,
            error_stack: error.stack,
            device_type: this.getDeviceType(),
            timestamp: new Date().toISOString()
        };
        
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: `Map redirect error: ${service}`,
                fatal: false,
                ...errorData
            });
        }
        
        // Custom analytics
        this.sendCustomAnalytics('map_error', errorData);
    }
    
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/iPad/.test(ua)) return 'iPad';
        if (/iPhone/.test(ua)) return 'iPhone';
        if (/Android/.test(ua)) {
            return /Mobile/.test(ua) ? 'Android Phone' : 'Android Tablet';
        }
        if (window.innerWidth <= 768) return 'Mobile';
        if (window.innerWidth <= 1024) return 'Tablet';
        return 'Desktop';
    }
    
    sendCustomAnalytics(event, data) {
        try {
            // Example custom analytics endpoint
            // Uncomment and modify for your analytics service
            /*
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, data }),
                keepalive: true
            }).catch(console.error);
            */
            
            console.log('📊 Analytics Event:', event, data);
        } catch (error) {
            console.error('Analytics error:', error);
        }
    }
    
    setupAnalytics() {
        // Track page load with comprehensive device info
        const pageData = {
            page_title: document.title,
            page_location: window.location.href,
            dojo_name: this.config.name,
            device_type: this.getDeviceType(),
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            color_depth: screen.colorDepth,
            pixel_ratio: window.devicePixelRatio || 1,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine,
            touch_support: 'ontouchstart' in window
        };
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', pageData);
        }
        
        if (typeof fbq !== 'undefined') {
            fbq('track', 'FindLocation', {
                dojo_name: this.config.name,
                device_type: this.getDeviceType()
            });
        }
        
        this.sendCustomAnalytics('page_load', pageData);
        
        // Track time on page
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - this.startTime) / 1000);
            if (typeof gtag !== 'undefined') {
                gtag('event', 'timing_complete', {
                    name: 'time_on_location_page',
                    value: timeOnPage,
                    event_category: 'engagement'
                });
            }
        });
        
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
            }
        });
        
        // Track exit intent (desktop only)
        if (!this.isMobile()) {
            document.addEventListener('mouseout', (e) => {
                if (e.clientY <= 0 || e.clientX <= 0 || 
                    (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'exit_intent', {
                            event_category: 'engagement',
                            scroll_depth: maxScroll
                        });
                    }
                }
            });
        }
    }
    
    addAccessibilityFeatures() {
        // Add ARIA labels for screen readers
        const buttons = document.querySelectorAll('[data-service]');
        buttons.forEach(button => {
            const service = button.dataset.service;
            const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
            button.setAttribute('aria-label', `Open ${serviceName} maps to get directions to ${this.config.name}`);
        });
        
        // Keyboard navigation improvements
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Clear any loading states and focus traps
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
                    loadingOverlay.classList.add('hidden');
                }
                
                // Reset button states
                buttons.forEach(button => {
                    this.hideLoadingState(button);
                });
            }
        });
        
        // Announce important changes to screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
        
        this.announcer = announcer;
    }
    
    announce(message) {
        if (this.announcer) {
            this.announcer.textContent = message;
            setTimeout(() => {
                this.announcer.textContent = '';
            }, 1000);
        }
    }
    
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.trackError('global', e.error);
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.trackError('promise', new Error(e.reason));
        });
    }
    
    enableAutoRedirect() {
        const autoRedirectDiv = document.getElementById('autoRedirect');
        const countdownSpan = document.getElementById('countdown');
        
        if (!autoRedirectDiv || !countdownSpan) return;
        
        autoRedirectDiv.classList.remove('hidden');
        this.announce('Auto-redirect starting in 3 seconds');
        
        let countdown = 3;
        const timer = setInterval(() => {
            countdown--;
            countdownSpan.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                
                // Smart redirect based on device
                let preferredService = 'google'; // default
                
                if (this.isIOS()) {
                    preferredService = 'apple';
                } else if (this.isAndroid()) {
                    preferredService = 'google';
                }
                
                this.announce(`Auto-redirecting to ${preferredService} maps`);
                
                // Track auto-redirect
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'auto_redirect', {
                        map_service: preferredService,
                        device_type: this.getDeviceType()
                    });
                }
                
                const button = document.querySelector(`[data-service="${preferredService}"]`);
                this.handleMapClick(preferredService, button);
            }
        }, 1000);
        
        // Cancel auto-redirect on user interaction
        const cancelAutoRedirect = () => {
            clearInterval(timer);
            autoRedirectDiv.classList.add('hidden');
            this.announce('Auto-redirect cancelled');
        };
        
        document.addEventListener('click', cancelAutoRedirect, { once: true });
        document.addEventListener('keydown', cancelAutoRedirect, { once: true });
        document.addEventListener('touchstart', cancelAutoRedirect, { once: true });
    }
    
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }
    
    isAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    isMobile() {
        return this.isIOS() || this.isAndroid() || window.innerWidth <= 768;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DojoMapRedirect());
} else {
    new DojoMapRedirect();
}

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}