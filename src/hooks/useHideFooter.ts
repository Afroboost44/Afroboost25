'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export const useHideFooter = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Define the routes where footer should be hidden
  const hideFooterRoutes = [
    '/chat',
    '/community-chat',
    // Add any other chat-related routes here
  ];
  
  // Check if current path matches any of the routes where footer should be hidden
  const shouldHideFooter = pathname && hideFooterRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // Also hide footer when on course page with chat tab active
  const isCoursePageWithChat = pathname?.startsWith('/courses/') && 
    (searchParams?.get('tab') === 'chat' || searchParams?.get('activeTab') === 'chat');
  
  return shouldHideFooter || isCoursePageWithChat;
};
