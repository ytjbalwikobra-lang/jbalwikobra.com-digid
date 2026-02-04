import React, { useState } from 'react';
/**
 * Design System Showcase - Uses CyberDesignSystem (Cyber tokens)
 * The primary unified design system for this application
 */
import { 
  PNContainer, 
  PNCard, 
  PNButton
} from '../components/ui/CyberDesignSystem';

// Temporary placeholder components for future implementation
const PlaceholderComponent: React.FC<{ name: string; description: string; children?: React.ReactNode }> = ({ name, description, children }) => (
  <div className="border-2 border-dashed border-[var(--cyber-border)] rounded-cyber-lg p-4 bg-[var(--cyber-bg-pure)]/50">
    <div className="text-center space-y-2">
      <h4 className="font-semibold text-white">{name}</h4>
  <p className="text-sm text-[var(--cyber-text-secondary)]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  </div>
);

const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <PNContainer className="py-8">
  <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Cyber Design System Showcase</h1>
          <p className="text-[var(--cyber-text-secondary)] text-lg">
            Complete component library and design patterns for consistent UI
          </p>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-cyber-lg inline-block">
            ⚠️ This page is hidden from search engines and navigation
          </div>
        </div>

        {/* Navigation Tabs */}
        <PNCard>
          <div className="flex flex-wrap gap-2 p-2 bg-[var(--cyber-bg-pure)] rounded-cyber-lg">
            {['overview', 'colors', 'typography', 'buttons', 'forms'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-[var(--cyber-pink-primary)] text-white' 
                    : 'text-[var(--cyber-text-secondary)] hover:text-white hover:bg-[var(--cyber-bg-pure)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </PNCard>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <PNCard>
            <h2 className="text-2xl font-bold text-white mb-6">Design System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Implemented</h3>
                <ul className="text-sm text-[var(--cyber-text-secondary)] space-y-1">
                  <li>✅ Buttons (Primary, Secondary, Ghost)</li>
                  <li>✅ Cards (Multiple padding options)</li>
                  <li>✅ Container (Responsive layout)</li>
                  <li>✅ Color Palette (Cyber tokens)</li>
                  <li>✅ Typography Scale</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Future Components</h3>
                <ul className="text-sm text-[var(--cyber-text-secondary)] space-y-1">
                  <li>🔄 Form Controls (Input, Select, etc.)</li>
                  <li>🔄 Navigation (Tabs, Breadcrumb)</li>
                  <li>🔄 Feedback (Alert, Toast, Progress)</li>
                  <li>🔄 Overlays (Modal, Dialog)</li>
                  <li>🔄 Data Display (Table, Grid)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Status Legend</h3>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-white">✅ Available</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-white">🔄 In Progress</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-dashed border-[var(--cyber-border)] rounded"></div>
                    <span className="text-white">📋 Planned</span>
                  </li>
                </ul>
              </div>
            </div>
          </PNCard>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <PNCard>
            <h2 className="text-2xl font-bold text-white mb-6">Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-full h-16 bg-[var(--cyber-pink-primary)] rounded-cyber-lg shadow-sm"></div>
                <p className="text-sm font-medium text-white">cyber-pink-primary</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Primary brand color</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-[var(--cyber-bg-pure)] rounded-cyber-lg border border-[var(--cyber-border)]"></div>
                <p className="text-sm font-medium text-white">cyber-bg-pure</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Main background</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-[var(--cyber-bg-card)] rounded-cyber-lg"></div>
                <p className="text-sm font-medium text-white">cyber-bg-card</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Card backgrounds</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 border-2 border-[var(--cyber-border)] rounded-cyber-lg"></div>
                <p className="text-sm font-medium text-white">cyber-border</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Border elements</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-[var(--cyber-text-primary)] rounded-cyber-lg"></div>
                <p className="text-sm font-medium text-white">cyber-text-primary</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Primary text</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-[var(--cyber-text-secondary)] rounded-cyber-lg"></div>
                <p className="text-sm font-medium text-white">cyber-text-secondary</p>
                <p className="text-xs text-[var(--cyber-text-secondary)]">Secondary text</p>
              </div>
            </div>
          </PNCard>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <PNCard>
            <h2 className="text-2xl font-bold text-white mb-6">Typography System</h2>
            <div className="space-y-4">
              <div className="border-b border-[var(--cyber-border)] pb-4">
                <h1 className="text-4xl font-bold text-white">Display Large</h1>
                <p className="text-sm text-[var(--cyber-text-secondary)] mt-1">text-4xl font-bold</p>
              </div>
              <div className="border-b border-[var(--cyber-border)] pb-4">
                <h2 className="text-3xl font-bold text-white">Display Medium</h2>
                <p className="text-sm text-[var(--cyber-text-secondary)] mt-1">text-3xl font-bold</p>
              </div>
              <div className="border-b border-[var(--cyber-border)] pb-4">
                <h3 className="text-2xl font-semibold text-white">Display Small</h3>
                <p className="text-sm text-[var(--cyber-text-secondary)] mt-1">text-2xl font-semibold</p>
              </div>
              <div className="border-b border-[var(--cyber-border)] pb-4">
                <p className="text-base text-white">Body Large - Default paragraph text</p>
                <p className="text-sm text-[var(--cyber-text-secondary)] mt-1">text-base</p>
              </div>
              <div>
                <p className="text-sm text-[var(--cyber-text-secondary)]">Caption - Small text for metadata</p>
                <p className="text-xs text-[var(--cyber-text-secondary)] mt-1">text-sm text-[var(--cyber-text-secondary)]</p>
              </div>
            </div>
          </PNCard>
        )}

        {/* Buttons Tab */}
        {activeTab === 'buttons' && (
          <PNCard>
            <h2 className="text-2xl font-bold text-white mb-6">Button Components</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Primary Buttons</h3>
                <div className="space-y-3">
                  <PNButton variant="primary" size="lg" className="w-full">Large Primary</PNButton>
                  <PNButton variant="primary" size="md" className="w-full">Medium Primary</PNButton>
                  <PNButton variant="primary" size="sm" className="w-full">Small Primary</PNButton>
                  <PNButton variant="primary" size="md" disabled className="w-full">Disabled</PNButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Secondary Buttons</h3>
                <div className="space-y-3">
                  <PNButton variant="secondary" size="lg" className="w-full">Large Secondary</PNButton>
                  <PNButton variant="secondary" size="md" className="w-full">Medium Secondary</PNButton>
                  <PNButton variant="secondary" size="sm" className="w-full">Small Secondary</PNButton>
                  <PNButton variant="secondary" size="md" disabled className="w-full">Disabled</PNButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Ghost Buttons</h3>
                <div className="space-y-3">
                  <PNButton variant="ghost" size="lg" className="w-full">Large Ghost</PNButton>
                  <PNButton variant="ghost" size="md" className="w-full">Medium Ghost</PNButton>
                  <PNButton variant="ghost" size="sm" className="w-full">Small Ghost</PNButton>
                  <PNButton variant="ghost" size="md" disabled className="w-full">Disabled</PNButton>
                </div>
              </div>
            </div>
          </PNCard>
        )}

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <PNCard>
            <h2 className="text-2xl font-bold text-white mb-6">Form Components (Future)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlaceholderComponent name="CyberInput" description="Text input with Cyber styling">
                  <input className="w-full px-3 py-2 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg text-white focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:border-transparent" placeholder="Text Input Preview" />
              </PlaceholderComponent>

              <PlaceholderComponent name="CyberSelect" description="Dropdown select with Cyber styling">
                  <select className="w-full px-3 py-2 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg text-white focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:border-transparent">
                  <option>Select Preview</option>
                </select>
              </PlaceholderComponent>

              <PlaceholderComponent name="CyberTextarea" description="Multi-line text input">
                  <textarea className="w-full px-3 py-2 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg text-white focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:border-transparent" rows={3} placeholder="Textarea Preview"></textarea>
              </PlaceholderComponent>

              <PlaceholderComponent name="CyberCheckbox + CyberRadio" description="Form controls with Cyber styling">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-[var(--cyber-border)] text-[var(--cyber-pink-primary)] focus:ring-[var(--cyber-pink-primary)]" />
                    <span className="text-white">Checkbox Preview</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" className="border-[var(--cyber-border)] text-[var(--cyber-pink-primary)] focus:ring-[var(--cyber-pink-primary)]" />
                    <span className="text-white">Radio Preview</span>
                  </label>
                </div>
              </PlaceholderComponent>
            </div>
          </PNCard>
        )}

        {/* Component Status */}
        <PNCard>
          <h2 className="text-2xl font-bold text-white mb-4">Implementation Status</h2>
          <div className="p-4 bg-[var(--cyber-bg-surface)] border border-pink-500/30 rounded-cyber-lg">
            <p className="text-sm text-[var(--cyber-pink-primary)]">
              <strong>Note:</strong> This showcase displays both implemented components and planned future components. 
              Dashed border components are placeholders showing intended design patterns for future implementation.
            </p>
          </div>
        </PNCard>
      </div>
    </PNContainer>
  );
};

export default DesignSystemShowcase;
