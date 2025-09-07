'use client';

import { useState } from 'react';
import { PWAManager, PWAInstallButton, PWAInstallBanner, usePWAInstall } from '@/components/pwa';
import { useInteractiveWidgetSupport, useBrowserInfo } from '@/hooks/useInteractiveWidgetSupport';

/**
 * PWA Installation Test Page
 * 
 * Comprehensive testing interface for PWA installation components
 * Allows manual testing of all PWA features in development
 */
export default function PWATestPage() {
  const [showBanner, setShowBanner] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [bannerVariant, setBannerVariant] = useState<'banner' | 'toast' | 'card'>('toast');
  const [buttonVariant, setButtonVariant] = useState<'primary' | 'secondary' | 'minimal' | 'floating'>('primary');

  const pwaState = usePWAInstall();
  const supportsInteractiveWidget = useInteractiveWidgetSupport();
  const browserInfo = useBrowserInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            PWA Installation Test Suite
          </h1>
          <p className="text-xl text-purple-200">
            Test all PWA installation components and flows
          </p>
        </div>

        {/* PWA State Display */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-semibold text-white mb-4">Current PWA State</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-300">Platform:</span>
                <span className="text-white font-mono">{pwaState.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Installable:</span>
                <span className={`font-mono ${pwaState.isInstallable ? 'text-green-400' : 'text-red-400'}`}>
                  {String(pwaState.isInstallable)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Installed:</span>
                <span className={`font-mono ${pwaState.isInstalled ? 'text-green-400' : 'text-red-400'}`}>
                  {String(pwaState.isInstalled)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Standalone:</span>
                <span className={`font-mono ${pwaState.isStandalone ? 'text-green-400' : 'text-red-400'}`}>
                  {String(pwaState.isStandalone)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-300">Can Show Banner:</span>
                <span className={`font-mono ${pwaState.canShowBanner ? 'text-green-400' : 'text-red-400'}`}>
                  {String(pwaState.canShowBanner)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Show Install Banner:</span>
                <span className={`font-mono ${pwaState.showInstallBanner ? 'text-green-400' : 'text-red-400'}`}>
                  {String(pwaState.showInstallBanner)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Permanently Dismissed:</span>
                <span className={`font-mono ${pwaState.permanentlyDismissed ? 'text-red-400' : 'text-green-400'}`}>
                  {String(pwaState.permanentlyDismissed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Prompt Dismissed:</span>
                <span className={`font-mono ${pwaState.hasInstallPromptDismissed ? 'text-red-400' : 'text-green-400'}`}>
                  {String(pwaState.hasInstallPromptDismissed)}
                </span>
              </div>
            </div>

            {/* Interactive Widget & Browser Status */}
            <div className="mt-6 pt-4 border-t border-purple-500/20">
              <h4 className="text-lg font-semibold text-white mb-3">Interactive Widget Support</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-purple-300">Browser:</span>
                  <span className="font-mono text-blue-300">
                    {browserInfo ? `${browserInfo.name} ${browserInfo.version}` : 'Detecting...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Interactive Widget:</span>
                  <span className={`font-mono ${supportsInteractiveWidget ? 'text-green-400' : 'text-yellow-400'}`}>
                    {supportsInteractiveWidget ? 'Supported' : 'CSS-only fallback'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Viewport Mode:</span>
                  <span className="font-mono text-blue-300">
                    {supportsInteractiveWidget ? 'resizes-visual' : 'fixed viewport + CSS'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-black/40 rounded-lg text-sm text-purple-200">
                <p className="font-semibold mb-2">What this means:</p>
                {supportsInteractiveWidget ? (
                  <p>✅ Your browser supports the cutting-edge <code className="bg-purple-900/50 px-1 rounded">interactive-widget</code> viewport property! Virtual keyboards will resize only the visual viewport, providing the smoothest keyboard experience.</p>
                ) : (
                  <p>🎨 Your browser uses our elegant CSS-only solution with <code className="bg-purple-900/50 px-1 rounded">100dvh</code> and <code className="bg-purple-900/50 px-1 rounded">env(keyboard-height)</code> for ChatGPT-style keyboard handling.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <button
              onClick={pwaState.resetPreferences}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Reset All Preferences
            </button>
          </div>
        </div>

        {/* Component Testing Controls */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Install Button Testing */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Install Button Testing</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-purple-300 mb-2">Variant:</label>
                <select
                  value={buttonVariant}
                  onChange={(e) => setButtonVariant(e.target.value as any)}
                  className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="minimal">Minimal</option>
                  <option value="floating">Floating</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <PWAInstallButton variant={buttonVariant} size="sm" />
              <PWAInstallButton variant={buttonVariant} size="md" />
              <PWAInstallButton variant={buttonVariant} size="lg" />
            </div>
          </div>

          {/* Banner Testing */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Banner Testing</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-purple-300 mb-2">Variant:</label>
                <select
                  value={bannerVariant}
                  onChange={(e) => setBannerVariant(e.target.value as any)}
                  className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white"
                >
                  <option value="toast">Toast</option>
                  <option value="banner">Banner</option>
                  <option value="card">Card</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center text-purple-300">
                  <input
                    type="checkbox"
                    checked={showBanner}
                    onChange={(e) => setShowBanner(e.target.checked)}
                    className="mr-2"
                  />
                  Show Manual Banner
                </label>
              </div>
            </div>

            {showBanner && (
              <div className="relative">
                <PWAInstallBanner
                  variant={bannerVariant}
                  position="top"
                  autoShowDelay={0}
                  showCloseButton={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* PWA Manager Testing */}
        <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-4">Full PWA Manager</h3>
          <p className="text-purple-200 mb-4">
            The PWA Manager orchestrates all components automatically based on installation state.
          </p>
          
          <div>
            <label className="flex items-center text-purple-300">
              <input
                type="checkbox"
                checked={showFloatingButton}
                onChange={(e) => setShowFloatingButton(e.target.checked)}
                className="mr-2"
              />
              Show Floating Button
            </label>
          </div>
        </div>

        {/* Platform-Specific Instructions */}
        <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-4">Platform-Specific Testing</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h4 className="font-semibold text-blue-300 mb-2">iOS Safari</h4>
              <ul className="space-y-1 text-blue-100">
                <li>• Manual installation via Share button</li>
                <li>• Shows instructions when clicked</li>
                <li>• No beforeinstallprompt event</li>
                <li>• Detects standalone mode</li>
              </ul>
            </div>

            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <h4 className="font-semibold text-green-300 mb-2">Android Chrome</h4>
              <ul className="space-y-1 text-green-100">
                <li>• Automatic install prompt</li>
                <li>• Native beforeinstallprompt</li>
                <li>• Programmatic installation</li>
                <li>• App installed events</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <h4 className="font-semibold text-purple-300 mb-2">Desktop Browsers</h4>
              <ul className="space-y-1 text-purple-100">
                <li>• Chrome/Edge install prompts</li>
                <li>• Address bar install button</li>
                <li>• Browser-specific flows</li>
                <li>• Window install events</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-4">Testing Instructions</h3>
          <div className="space-y-3 text-purple-200">
            <p>1. <strong>Desktop:</strong> Open in Chrome/Edge, look for install button in address bar</p>
            <p>2. <strong>Android:</strong> Open in Chrome, wait for automatic install prompt</p>
            <p>3. <strong>iOS:</strong> Open in Safari, tap Share button → Add to Home Screen</p>
            <p>4. <strong>Development:</strong> Use Chrome DevTools Application tab to simulate install events</p>
            <p>5. <strong>Testing:</strong> Use "Reset All Preferences" to clear localStorage and test fresh states</p>
          </div>
        </div>

        {/* Conditional PWA Manager */}
        {showFloatingButton && (
          <PWAManager
            showFloatingButton={true}
            showInstallBanner={false} // Disabled to avoid conflicts with manual banner
            showWelcomeMessage={true}
            floatingButtonPosition="bottom-right"
          />
        )}
      </div>
    </div>
  );
}