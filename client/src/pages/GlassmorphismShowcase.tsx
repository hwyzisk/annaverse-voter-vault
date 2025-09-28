import { useState } from "react";
import { GlassCard, GlassButton, GlassModal, GlassBadge, GlassProgress } from "@/components/ui/GlassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Vote,
  UserCheck,
  TrendingUp,
  Activity,
  Star,
  Heart,
  Zap,
  Award,
  Target,
  BarChart3
} from "lucide-react";

export default function GlassmorphismShowcase() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
      {/* Hero Section with Floating Cards */}
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            AnnaVerse Glassmorphism Design
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Experience the future of political campaign management with our cutting-edge glassmorphism interface
          </p>
        </div>

        {/* Stats Grid with Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <GlassCard variant="democrat" className="p-6" float>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Supporters</p>
                <p className="text-white text-3xl font-bold">12,847</p>
                <p className="text-blue-300 text-sm">+12% this week</p>
              </div>
              <Users className="w-8 h-8 text-blue-300" />
            </div>
            <GlassProgress value={68} className="mt-4" showValue />
          </GlassCard>

          <GlassCard variant="republican" className="p-6" float>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm font-medium">Confirmed Votes</p>
                <p className="text-white text-3xl font-bold">8,451</p>
                <p className="text-red-300 text-sm">+8% this week</p>
              </div>
              <Vote className="w-8 h-8 text-red-300" />
            </div>
            <GlassProgress value={85} className="mt-4" showValue />
          </GlassCard>

          <GlassCard variant="success" className="p-6" float>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-medium">Volunteers</p>
                <p className="text-white text-3xl font-bold">2,134</p>
                <p className="text-green-300 text-sm">+23% this week</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-300" />
            </div>
            <GlassProgress value={42} className="mt-4" showValue />
          </GlassCard>

          <GlassCard variant="warning" className="p-6" float>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm font-medium">Engagement</p>
                <p className="text-white text-3xl font-bold">94%</p>
                <p className="text-yellow-300 text-sm">+5% this week</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-300" />
            </div>
            <GlassProgress value={94} className="mt-4" showValue />
          </GlassCard>
        </div>

        {/* Interactive Demo Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Glass Buttons Demo */}
          <GlassCard className="p-8">
            <h3 className="text-white text-2xl font-bold mb-6">Glass Button Variants</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <GlassButton onClick={() => setSelectedDemo('default')}>
                  Default Button
                </GlassButton>
                <GlassButton variant="democrat" onClick={() => setSelectedDemo('democrat')}>
                  <Star className="w-4 h-4 mr-2" />
                  Democrat
                </GlassButton>
                <GlassButton variant="republican" onClick={() => setSelectedDemo('republican')}>
                  <Heart className="w-4 h-4 mr-2" />
                  Republican
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-4">
                <GlassButton variant="success" onClick={() => setSelectedDemo('success')}>
                  <Zap className="w-4 h-4 mr-2" />
                  Success
                </GlassButton>
                <GlassButton variant="danger" onClick={() => setSelectedDemo('danger')}>
                  <Award className="w-4 h-4 mr-2" />
                  Danger
                </GlassButton>
                <Button onClick={() => setShowModal(true)} className="glass-button">
                  Show Modal
                </Button>
              </div>
              {selectedDemo && (
                <div className="glass-card p-4 mt-4">
                  <p className="text-white">Selected: {selectedDemo}</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Glass Badges Demo */}
          <GlassCard className="p-8">
            <h3 className="text-white text-2xl font-bold mb-6">Glass Badge Collection</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <GlassBadge>Default</GlassBadge>
                <GlassBadge variant="democrat">Democrat</GlassBadge>
                <GlassBadge variant="republican">Republican</GlassBadge>
                <GlassBadge variant="independent">Independent</GlassBadge>
              </div>
              <div className="flex flex-wrap gap-3">
                <GlassBadge variant="success">✓ Confirmed</GlassBadge>
                <GlassBadge variant="warning">⚠ Pending</GlassBadge>
                <GlassBadge variant="danger">✗ Rejected</GlassBadge>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Contact Card Example */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <GlassCard variant="light" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">JS</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Jane Smith</h4>
                  <p className="text-white/60 text-sm">Registered Voter</p>
                </div>
              </div>
              <GlassBadge variant="democrat">DEM</GlassBadge>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>📍 District 12, Columbus</p>
              <p>📧 jane.smith@email.com</p>
              <p>📞 (555) 123-4567</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <GlassButton className="flex-1 text-xs py-2">Contact</GlassButton>
              <GlassButton className="flex-1 text-xs py-2">View Profile</GlassButton>
            </div>
          </GlassCard>

          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">MD</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Mike Davis</h4>
                  <p className="text-white/60 text-sm">Volunteer</p>
                </div>
              </div>
              <GlassBadge variant="republican">REP</GlassBadge>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>📍 District 8, Cleveland</p>
              <p>📧 mike.davis@email.com</p>
              <p>📞 (555) 987-6543</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <GlassButton variant="success" className="flex-1 text-xs py-2">
                <Target className="w-3 h-3 mr-1" />
                Assign Task
              </GlassButton>
              <GlassButton className="flex-1 text-xs py-2">Message</GlassButton>
            </div>
          </GlassCard>

          <GlassCard variant="independent" className="p-6">
            <div className="text-center">
              <Activity className="w-12 h-12 text-purple-300 mx-auto mb-4" />
              <h4 className="text-white font-semibold mb-2">Campaign Analytics</h4>
              <p className="text-white/60 text-sm mb-4">Real-time insights</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Voter Outreach</span>
                    <span className="text-white">73%</span>
                  </div>
                  <GlassProgress value={73} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Volunteer Engagement</span>
                    <span className="text-white">91%</span>
                  </div>
                  <GlassProgress value={91} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Goal Progress</span>
                    <span className="text-white">58%</span>
                  </div>
                  <GlassProgress value={58} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <GlassCard variant="strong" className="p-12 max-w-4xl mx-auto">
            <BarChart3 className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Campaign?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Experience the power of glassmorphism design combined with cutting-edge campaign management tools
            </p>
            <div className="flex justify-center space-x-4">
              <GlassButton variant="success" className="px-8 py-4 text-lg">
                Get Started
              </GlassButton>
              <GlassButton className="px-8 py-4 text-lg">
                Learn More
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Glass Modal Example */}
      <GlassModal isOpen={showModal}>
        <div className="p-8">
          <h3 className="text-white text-2xl font-bold mb-4">Glassmorphism Modal</h3>
          <p className="text-white/70 mb-6">
            This is an example of how modals look with the glassmorphism design system.
            Notice the beautiful blur effects and transparency.
          </p>
          <div className="flex justify-end space-x-4">
            <GlassButton onClick={() => setShowModal(false)}>
              Close
            </GlassButton>
            <GlassButton variant="success">
              Save Changes
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}