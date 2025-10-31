<<<<<<< HEAD
'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
   import { useAuth } from '@/lib/auth'; // Replace with your actual auth hook
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCalendar, FiUsers, FiMusic, FiStar } from 'react-icons/fi';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import Card from '@/components/Card';
import { adminSettingsService, homePageService } from '@/lib/database';

export default function Home() {
  const { t } = useTranslation(); // Initialize useTranslation
  const [heroImage, setHeroImage] = useState<string>('');
  const [heroVideo, setHeroVideo] = useState<string>('');
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [heroTitle, setHeroTitle] = useState<string>(t('heroTitle'));
  const [heroSubtitle, setHeroSubtitle] = useState<string>(t('heroSubtitle'));

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [backgroundSettings, homePageSettings] = await Promise.all([
          adminSettingsService.getBackgroundSettings(),
          homePageService.get()
          
        ]);
        
        setHeroImage(backgroundSettings?.backgroundImageUrl ?? '');
        
        // Prioritize uploaded video over external video link
        const uploadedVideoUrl = homePageSettings?.uploadedVideoUrl;
        const externalVideoLink = homePageSettings?.heroVideoLink;
        setHeroTitle(homePageSettings?.heroTitle || t('heroTitle'));
        setHeroSubtitle(homePageSettings?.heroSubtitle || t('heroSubtitle'));
        if (uploadedVideoUrl) {
          setHeroVideo(uploadedVideoUrl);
          setVideoEnabled(true);
        } else if (externalVideoLink) {
          setHeroVideo(externalVideoLink);
          setVideoEnabled(true);
        } else {
          setVideoEnabled(false);
        }
        
      } catch (error) {
        console.error('Error fetching settings:', error);
        setHeroImage('https://images.unsplash.com/photo-1507539989371-99615e449486?q=80&w=1262&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
      }
    };

    fetchSettings();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // If you want to redirect authenticated users, you need to get the user object from your auth context or hook.
  // Example using a placeholder for user and router (uncomment and adjust as needed):

  if( useAuth().user) {
    const router = useRouter();
    useEffect(() => {
      router.push('/publications'); // Redirect authenticated users to the dashboard
    }
    , [router]);
    return null; // Prevent rendering the home page for authenticated users
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Media - Video or Image */}
        <div className="absolute inset-0 z-0">
          {videoEnabled && heroVideo ? (
            <>
              {/* Video Background */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-80"
                poster={heroImage} // Use image as fallback poster
              >
                <source src={heroVideo} type="video/mp4" />
                <source src={heroVideo.replace('.mp4', '.webm')} type="video/webm" />
                Your browser does not support video playback.
              </video>
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  onClick={(e) => {
                    const video = (e.target as HTMLElement).closest('section')?.querySelector('video');
                    if (video) {
                      if (video.paused) {
                        video.play();
                      } else {
                        video.pause();
                      }
                    }
                  }}
                  className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                  title="Play/Pause video"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* Background Image Fallback */
            <Image
              src={heroImage}
              alt="Dance Background"
              fill
              className="object-cover opacity-80"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/0"></div>
        </div>
        
        <div className="container mx-auto px-6 md:px-8 z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-6" 
                dangerouslySetInnerHTML={{ __html: heroTitle }}>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl">
              {heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/courses" className="btn-primary text-center">
                {t('bookClass')}
              </Link>
              <Link href="/signup" className="btn-secondary text-center">
                {t('joinUs')}
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#D91CD2]/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#7000FF]/20 blur-3xl"
        />
      </section>

      {/* Features Section */}
      <section className="section-spacing bg-black relative">
        <div className="content-spacing">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={item} className="text-2xl md:text-3xl font-bold mb-4"
              dangerouslySetInnerHTML={{ __html: t('whyChoose') }}>
            </motion.h2>
            <motion.p variants={item} className="text-lg text-gray-300 max-w-xl mx-auto">
              {t('whyChooseSubtitle')}
            </motion.p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10"
          >
            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiMusic className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('authenticRhythms')}</h3>
                <p className="text-gray-400 text-sm">
                  {t('authenticRhythmsDesc')}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiUsers className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('vibrantCommunity')}</h3>
                <p className="text-gray-400 text-sm">
                  {t('vibrantCommunityDesc')}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiCalendar className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('flexibleSchedule')}</h3>
                <p className="text-gray-400 text-sm">
                  {t('flexibleScheduleDesc')}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiStar className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('expertCoaches')}</h3>
                <p className="text-gray-400 text-sm">
                  {t('expertCoachesDesc')}
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Classes Preview */}
      <section className="section-spacing bg-black relative">
        <div className="content-spacing">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-center mb-12"
          >
            <motion.div variants={item} className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold"
                dangerouslySetInnerHTML={{ __html: t('popularClasses') }}>
              </h2>
              <p className="text-lg text-gray-300 mt-2">
                {t('popularClassesSubtitle')}
              </p>
            </motion.div>
            <motion.div variants={item}>
              <Link href="/courses" className="btn-primary flex items-center">
                {t('viewAllClasses')} <FiArrowRight className="ml-2" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1594125674956-61a9b49c8ecc?q=80&w=1974&auto=format&fit=crop"
                    alt="Afrobeat Basics"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t('beginner')}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t('afrobeatBasics')}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t('afrobeatBasicsDesc')}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t('pricePerSession').replace('{price}', '25')}</span>
                  <Link href="/courses" className="btn-secondary text-xs">
                    {t('bookNow')}
                  </Link>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1533106958148-daaeab8b83fe?q=80&w=2070&auto=format&fit=crop"
                    alt="Intermediate Choreography"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t('intermediate')}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t('intermediateChoreography')}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t('intermediateChoreographyDesc')}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t('pricePerSession').replace('{price}', '30')}</span>
                  <Link href="/courses" className="btn-secondary text-xs">
                    {t('bookNow')}
                  </Link>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d29ya3Nob3B8ZW58MHx8MHx8fDA%3D"
                    alt="Advanced Workshop"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t('advanced')}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t('advancedWorkshop')}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t('advancedWorkshopDesc')}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t('pricePerSession').replace('{price}', '35')}</span>
                  <Link href="/courses" className="btn-secondary text-xs">
                    {t('bookNow')}
                  </Link>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-black relative">
        <div className="container mx-auto px-4">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={item} className="text-3xl md:text-4xl font-bold mb-4"
              dangerouslySetInnerHTML={{ __html: t('testimonials') }}>
            </motion.h2>
            <motion.p variants={item} className="text-xl text-gray-300 max-w-2xl mx-auto">
              {t('testimonialsSubtitle')}
            </motion.p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      alt="Sarah"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Sarah M.</h3>
                    <p className="text-sm text-gray-400">{t('student')}, 6 {t('months')}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t('sarahTestimonial')}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"
                      alt="David"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">David K.</h3>
                    <p className="text-sm text-gray-400">{t('student')}, 1 {t('year')}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t('davidTestimonial')}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
                      alt="Michelle"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Michelle T.</h3>
                    <p className="text-sm text-gray-400">{t('student')}, 3 {t('months')}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t('michelleTestimonial')}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black relative">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop"
            alt="Dance Background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
        </div>
        
        <div className="container mx-auto px-4 z-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6"
              dangerouslySetInnerHTML={{ __html: t('readyToFeel') }}>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              {t('readyToFeelSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/courses" className="btn-primary text-center text-lg">
                {t('exploreClasses')}
              </Link>
              <Link href="/signup" className="btn-secondary text-center text-lg">
                {t('signUpNow')}
                {/* No additional code needed here, just closing the Link and div */}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
=======
'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCalendar, FiUsers, FiMusic, FiStar } from 'react-icons/fi';
import { AppContext, translations } from './providers';
import Card from '@/components/Card';
import { adminSettingsService } from '@/lib/database';

export default function Home() {
  const { language } = useContext(AppContext);
  const t = translations[language];
  const [heroImage, setHeroImage] = useState<string>('');

  useEffect(() => {
    const fetchBackgroundImage = async () => {
      try {
        const settings = await adminSettingsService.getBackgroundSettings();
        setHeroImage(settings?.backgroundImageUrl ?? '');
      } catch (error) {
        console.error('Error fetching background image:', error);
        setHeroImage('https://images.unsplash.com/photo-1507539989371-99615e449486?q=80&w=1262&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
      }
    };

    fetchBackgroundImage();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt="Dance Background"
            fill
            className="object-cover opacity-80"
            priority
          />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/0"></div>
        </div>
        
        <div className="container mx-auto px-6 md:px-8 z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-6" 
                dangerouslySetInnerHTML={{ __html: t.heroTitle }}>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/courses" className="btn-primary text-center">
                {t.bookClass}
              </Link>
              <Link href="/signup" className="btn-secondary text-center">
                {t.joinUs}
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#D91CD2]/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#7000FF]/20 blur-3xl"
        />
      </section>

      {/* Features Section */}
      <section className="section-spacing bg-black relative">
        <div className="content-spacing">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={item} className="text-2xl md:text-3xl font-bold mb-4"
              dangerouslySetInnerHTML={{ __html: t.whyChoose }}>
            </motion.h2>
            <motion.p variants={item} className="text-lg text-gray-300 max-w-xl mx-auto">
              {t.whyChooseSubtitle}
            </motion.p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10"
          >
            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiMusic className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t.authenticRhythms}</h3>
                <p className="text-gray-400 text-sm">
                  {t.authenticRhythmsDesc}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiUsers className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t.vibrantCommunity}</h3>
                <p className="text-gray-400 text-sm">
                  {t.vibrantCommunityDesc}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiCalendar className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t.flexibleSchedule}</h3>
                <p className="text-gray-400 text-sm">
                  {t.flexibleScheduleDesc}
                </p>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="text-center py-8 h-full">
                <div className="w-14 h-14 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiStar className="text-2xl text-[#D91CD2]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{t.expertCoaches}</h3>
                <p className="text-gray-400 text-sm">
                  {t.expertCoachesDesc}
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Classes Preview */}
      <section className="section-spacing bg-black relative">
        <div className="content-spacing">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-center mb-12"
          >
            <motion.div variants={item} className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold"
                dangerouslySetInnerHTML={{ __html: t.popularClasses }}>
              </h2>
              <p className="text-lg text-gray-300 mt-2">
                {t.popularClassesSubtitle}
              </p>
            </motion.div>
            <motion.div variants={item}>
              <Link href="/courses" className="btn-primary flex items-center">
                {t.viewAllClasses} <FiArrowRight className="ml-2" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1594125674956-61a9b49c8ecc?q=80&w=1974&auto=format&fit=crop"
                    alt="Afrobeat Basics"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t.beginner}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t.afrobeatBasics}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t.afrobeatBasicsDesc}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t.pricePerSession.replace('{price}', '25')}</span>
                  <Link href="/courses/1" className="btn-secondary text-xs">
                    {t.bookNow}
                  </Link>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1533106958148-daaeab8b83fe?q=80&w=2070&auto=format&fit=crop"
                    alt="Intermediate Choreography"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t.intermediate}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t.intermediateChoreography}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t.intermediateChoreographyDesc}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t.pricePerSession.replace('{price}', '30')}</span>
                  <Link href="/courses/2" className="btn-secondary text-xs">
                    {t.bookNow}
                  </Link>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="overflow-hidden h-full">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d29ya3Nob3B8ZW58MHx8MHx8fDA%3D"
                    alt="Advanced Workshop"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {t.advanced}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{t.advancedWorkshop}</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  {t.advancedWorkshopDesc}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[#D91CD2] text-sm">{t.pricePerSession.replace('{price}', '35')}</span>
                  <Link href="/courses/3" className="btn-secondary text-xs">
                    {t.bookNow}
                  </Link>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-black relative">
        <div className="container mx-auto px-4">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={item} className="text-3xl md:text-4xl font-bold mb-4"
              dangerouslySetInnerHTML={{ __html: t.testimonials }}>
            </motion.h2>
            <motion.p variants={item} className="text-xl text-gray-300 max-w-2xl mx-auto">
              {t.testimonialsSubtitle}
            </motion.p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      alt="Sarah"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Sarah M.</h3>
                    <p className="text-sm text-gray-400">{t.student}, 6 {t.months}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t.sarahTestimonial}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"
                      alt="David"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">David K.</h3>
                    <p className="text-sm text-gray-400">{t.student}, 1 {t.year}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t.davidTestimonial}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full">
                <div className="flex items-center mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
                      alt="Michelle"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Michelle T.</h3>
                    <p className="text-sm text-gray-400">{t.student}, 3 {t.months}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  {t.michelleTestimonial}
                </p>
                <div className="flex text-[#D91CD2] mt-4">
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                  <FiStar />
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black relative">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop"
            alt="Dance Background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
        </div>
        
        <div className="container mx-auto px-4 z-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6"
              dangerouslySetInnerHTML={{ __html: t.readyToFeel }}>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              {t.readyToFeelSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/courses" className="btn-primary text-center text-lg">
                {t.exploreClasses}
              </Link>
              <Link href="/signup" className="btn-secondary text-center text-lg">
                {t.signUpNow}
                {/* No additional code needed here, just closing the Link and div */}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
>>>>>>> ddd273af2a7b494359b5df1cd43dbc83468035f0
}