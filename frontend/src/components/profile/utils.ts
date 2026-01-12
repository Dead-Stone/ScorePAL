/**
 * Profile Utilities
 */

export const getRoleColor = (role: string) => {
  const colors = {
    teacher: 'bg-blue-100 text-blue-800 border-blue-200',
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    student: 'bg-green-100 text-green-800 border-green-200',
    grader: 'bg-orange-100 text-orange-800 border-orange-200'
  };
  return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getInitials = (user: any) => {
  if (user?.first_name && user?.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  return user?.email?.[0]?.toUpperCase() || 'U';
};
