'use client'

import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { TagsScroll } from '@/components/landing/tags-scroll'
import { FeaturesGrid } from '@/components/landing/features-grid'
import { FeaturesTabs } from '@/components/landing/features-tabs'
import { Automations } from '@/components/landing/automations'
import { CRMPipeline } from '@/components/landing/crm-pipeline'
import { CTADark } from '@/components/landing/cta-dark'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <Navbar />
      <Hero />
      <TagsScroll />
      <FeaturesGrid />
      <FeaturesTabs />
      <Automations />
      <CRMPipeline />
      <CTADark />
      <Pricing />
      <Footer />
    </div>
  )
}
