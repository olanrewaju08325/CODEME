// API Client for FastAPI Backend
// This replaces direct Supabase data calls with backend API calls

// Get the current Supabase session token
async function getAuthToken(): Promise<string | null> {
  const { supabase } = await import('./supabaseClient');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Generic authenticated fetch wrapper
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // URL should include full path with /api prefix
  // The vite proxy will forward /api requests to the backend
  return fetch(url, {
    ...options,
    headers,
  });
}

// Auth & Profile API
export const authAPI = {
  getProfile: async () => {
    const response = await authenticatedFetch('/api/profile/me');
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },
  
  updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
    const response = await authenticatedFetch('/api/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },
  
  updateStreak: async () => {
    const response = await authenticatedFetch('/api/profile/update-streak', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to update streak');
    return response.json();
  },
  
  getUnreadCount: async () => {
    const response = await authenticatedFetch('/api/notifications/unread-count');
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },
  
  getNotifications: async (limit = 50) => {
    const response = await authenticatedFetch(`/api/notifications?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },
  
  markNotificationsRead: async () => {
    const response = await authenticatedFetch('/api/notifications/mark-read', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark notifications as read');
    return response.json();
  },
  
  getCertificateStatus: async (courseId = 'wd101') => {
    const response = await authenticatedFetch(`/api/profile/certificate-status?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch certificate status');
    return response.json();
  },
};

// Enrollment API
export const enrollmentAPI = {
  autoEnroll: async (courseId = 'wd101') => {
    const response = await authenticatedFetch('/api/enrollment/auto-enroll', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    });
    if (!response.ok) throw new Error('Failed to auto-enroll');
    return response.json();
  },
};

// Courses API
export const coursesAPI = {
  getCourses: async () => {
    const response = await authenticatedFetch('/api/courses');
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },
  
  getCourseModules: async (courseId: string) => {
    const response = await authenticatedFetch(`/api/courses/${courseId}/modules`);
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
  },
  
  getModuleLessons: async (moduleId: string) => {
    const response = await authenticatedFetch(`/api/modules/${moduleId}/lessons`);
    if (!response.ok) throw new Error('Failed to fetch lessons');
    return response.json();
  },
  
  getLesson: async (lessonId: string) => {
    const response = await authenticatedFetch(`/api/lessons/${lessonId}`);
    if (!response.ok) throw new Error('Failed to fetch lesson');
    return response.json();
  },
  
  getProgress: async () => {
    const response = await authenticatedFetch('/api/progress');
    if (!response.ok) throw new Error('Failed to fetch progress');
    return response.json();
  },
  
  markLessonComplete: async (lessonId: string) => {
    const response = await authenticatedFetch(`/api/progress/${lessonId}/complete`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark lesson complete');
    return response.json();
  },
  
  getSubmissions: async () => {
    const response = await authenticatedFetch('/api/assignments/submissions');
    if (!response.ok) throw new Error('Failed to fetch submissions');
    return response.json();
  },
  
  getAssignmentForSubmit: async (assignmentId: string) => {
    const response = await authenticatedFetch(`/api/assignments/${assignmentId}/submit`);
    if (!response.ok) throw new Error('Failed to fetch assignment');
    return response.json();
  },
  
  submitAssignment: async (assignmentId: string, data: { submission_text?: string; submission_file?: string }) => {
    const response = await authenticatedFetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit assignment');
    return response.json();
  },
  
  getLiveClasses: async (activeOnly = true) => {
    const response = await authenticatedFetch(`/api/live-classes?active_only=${activeOnly}`);
    if (!response.ok) throw new Error('Failed to fetch live classes');
    return response.json();
  },
  
  getUpcomingClasses: async (limit = 10) => {
    const response = await authenticatedFetch(`/api/live-classes/upcoming?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch upcoming classes');
    return response.json();
  },
  
  getGamificationStats: async () => {
    const response = await authenticatedFetch('/api/gamification/stats');
    if (!response.ok) throw new Error('Failed to fetch gamification stats');
    return response.json();
  },
  
  getUserAchievements: async () => {
    const response = await authenticatedFetch('/api/gamification/achievements');
    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
  },
  
  getBadges: async () => {
    const response = await authenticatedFetch('/api/gamification/badges');
    if (!response.ok) throw new Error('Failed to fetch badges');
    return response.json();
  },
};

// Quizzes API
export const quizzesAPI = {
  getModuleQuizzes: async (moduleId: string) => {
    const response = await authenticatedFetch(`/api/modules/${moduleId}/quizzes`);
    if (!response.ok) throw new Error('Failed to fetch quizzes');
    return response.json();
  },
  
  getQuiz: async (quizId: string) => {
    const response = await authenticatedFetch(`/api/quizzes/${quizId}`);
    if (!response.ok) throw new Error('Failed to fetch quiz');
    return response.json();
  },
  
  getQuizAttempts: async (quizId: string) => {
    const response = await authenticatedFetch(`/api/quizzes/${quizId}/attempts`);
    if (!response.ok) throw new Error('Failed to fetch quiz attempts');
    return response.json();
  },
  
  submitQuiz: async (quizId: string, answers: Array<{ question_id: string; answer: string }>) => {
    const response = await authenticatedFetch(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) throw new Error('Failed to submit quiz');
    return response.json();
  },
};

// Certificates API
export const certificatesAPI = {
  getCertificates: async () => {
    const response = await authenticatedFetch('/api/certificates');
    if (!response.ok) throw new Error('Failed to fetch certificates');
    return response.json();
  },
  
  checkEligibility: async (courseId = 'wd101') => {
    const response = await authenticatedFetch(`/api/certificates/check-eligibility?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to check eligibility');
    return response.json();
  },
  
  issueCertificate: async (courseId: string, certificateUrl: string) => {
    const response = await authenticatedFetch('/api/certificates/issue', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, certificate_url: certificateUrl }),
    });
    if (!response.ok) throw new Error('Failed to issue certificate');
    return response.json();
  },
};

// Forum API
export const forumAPI = {
  getPosts: async (category?: string) => {
    const url = category ? `/api/forum/posts?category=${category}` : '/api/forum/posts';
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json();
  },
  
  getPost: async (postId: string) => {
    const response = await authenticatedFetch(`/api/forum/posts/${postId}`);
    if (!response.ok) throw new Error('Failed to fetch post');
    return response.json();
  },
  
  createPost: async (data: { title: string; content: string; category?: string }) => {
    const response = await authenticatedFetch('/api/forum/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  },
  
  updatePost: async (postId: string, data: { title?: string; content?: string; category?: string }) => {
    const response = await authenticatedFetch(`/api/forum/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update post');
    return response.json();
  },
  
  deletePost: async (postId: string) => {
    const response = await authenticatedFetch(`/api/forum/posts/${postId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete post');
    return response.json();
  },
  
  getReplies: async (postId: string) => {
    const response = await authenticatedFetch(`/api/forum/posts/${postId}/replies`);
    if (!response.ok) throw new Error('Failed to fetch replies');
    return response.json();
  },
  
  createReply: async (postId: string, data: { content: string }) => {
    const response = await authenticatedFetch(`/api/forum/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create reply');
    return response.json();
  },
  
  updateReply: async (replyId: string, data: { content: string }) => {
    const response = await authenticatedFetch(`/api/forum/replies/${replyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update reply');
    return response.json();
  },
  
  deleteReply: async (replyId: string) => {
    const response = await authenticatedFetch(`/api/forum/replies/${replyId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete reply');
    return response.json();
  },
};

// Admin API
export const adminAPI = {
  getEnrollmentApplications: async () => {
    const response = await authenticatedFetch('/api/admin/enrollment-applications');
    if (!response.ok) throw new Error('Failed to fetch enrollment applications');
    return response.json();
  },
  
  updateApplicationStatus: async (applicationId: string, status: string) => {
    const response = await authenticatedFetch(`/api/admin/enrollment-applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update application status');
    return response.json();
  },
  
  getWaitlist: async () => {
    const response = await authenticatedFetch('/api/admin/waitlist');
    if (!response.ok) throw new Error('Failed to fetch waitlist');
    return response.json();
  },

  getCourseCapacities: async () => {
    const response = await authenticatedFetch('/api/admin/course-capacities');
    if (!response.ok) throw new Error('Failed to fetch course capacities');
    return response.json();
  },
  
  promoteStudent: async (enrollmentId: string, targetBatch: number) => {
    const response = await authenticatedFetch(`/api/admin/waitlist/${enrollmentId}/promote`, {
      method: 'POST',
      body: JSON.stringify({ target_batch: targetBatch }),
    });
    if (!response.ok) throw new Error('Failed to promote student');
    return response.json();
  },
  
  updateBatchCapacity: async (maxBatchSize: number) => {
    const response = await authenticatedFetch('/api/admin/settings/batch-capacity', {
      method: 'PATCH',
      body: JSON.stringify({ max_batch_size: maxBatchSize }),
    });
    if (!response.ok) throw new Error('Failed to update batch capacity');
    return response.json();
  },
  
  createStudentAccount: async (data: { email: string; password: string; full_name: string; course_id?: string; user_id?: string }) => {
    const response = await authenticatedFetch('/api/admin/create-student-account', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create student account');
    return response.json();
  },
  
  createNotification: async (data: { user_id: string; title: string; message: string }) => {
    const response = await authenticatedFetch('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },
  
  getAllNotifications: async () => {
    const response = await authenticatedFetch('/api/admin/notifications');
    if (!response.ok) throw new Error('Failed to fetch all notifications');
    return response.json();
  },

  getPendingPayments: async () => {
    const response = await authenticatedFetch('/api/admin/payments/pending');
    if (!response.ok) throw new Error('Failed to fetch pending payments');
    return response.json();
  },

  updatePayment: async (paymentId: string, data: { status: string; rejection_reason?: string }) => {
    const response = await authenticatedFetch(`/api/admin/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update payment');
    return response.json();
  },
};

// Payments API
export const paymentsAPI = {
  submitPayment: async (data: { quiz_id: string; receipt_file_path: string; amount?: number }) => {
    const response = await authenticatedFetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit payment');
    return response.json();
  },

  getMyPayments: async (quizId: string) => {
    const response = await authenticatedFetch(`/api/payments/my?quiz_id=${quizId}`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    return response.json();
  },

  getApprovedCount: async (quizId: string) => {
    const response = await authenticatedFetch(`/api/payments/approved-count?quiz_id=${quizId}`);
    if (!response.ok) throw new Error('Failed to fetch approved payment count');
    return response.json();
  },
};

// Announcements API
export const announcementsAPI = {
  create: async (data: { title?: string; body?: string; content?: string }) => {
    const response = await authenticatedFetch('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create announcement');
    return response.json();
  },

  getAll: async () => {
    const response = await authenticatedFetch('/api/announcements');
    if (!response.ok) throw new Error('Failed to fetch announcements');
    return response.json();
  },

  getLatest: async () => {
    const response = await authenticatedFetch('/api/announcements/latest');
    if (!response.ok) return null;
    return response.json();
  },
};

export default {
  auth: authAPI,
  enrollment: enrollmentAPI,
  courses: coursesAPI,
  quizzes: quizzesAPI,
  certificates: certificatesAPI,
  forum: forumAPI,
  admin: adminAPI,
  payments: paymentsAPI,
  announcements: announcementsAPI,
};