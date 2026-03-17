import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4 p-6">
      <h1 className="text-4xl font-bold text-gray-300">404</h1>
      <p className="text-sm text-gray-500">Page not found</p>
      <Link
        to="/"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        Go to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
