/**
 * ScorePAL - Landing Page (Root Route)
 * Uses the same landing page component
 * Statically generated at build time
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import LandingPage from './landing';
import { GetStaticProps } from 'next';

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    // Revalidate every hour (optional, for ISR)
    revalidate: 3600,
  };
};

export default function HomePage() {
  return <LandingPage />;
}
