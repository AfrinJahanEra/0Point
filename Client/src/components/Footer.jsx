import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 py-8">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              Terms of service
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              Privacy Policy
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              Information Protection Policy
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              Company
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              FAQ
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors duration-300 font-medium text-sm md:text-base relative group">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>
          <div className="text-center text-gray-600 text-sm md:text-base font-light mt-4">
            Copyright Since 2012 © AtCoder Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;