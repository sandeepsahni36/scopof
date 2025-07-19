import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Menu,
  X,
  Check,
  Camera,
  ClipboardCheck,
  FileText,
  Shield,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { useAuthStore } from '../../store/authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
};

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const features = [
    {
      icon: <Camera className="h-6 w-6 text-primary-600" />,
      title: 'AI Damage Detection',
      description: 'Identify property damage using advanced AI technology through your phone camera.',
    },
    {
      icon: <ClipboardCheck className="h-6 w-6 text-primary-600" />,
      title: 'Customizable Checklists',
      description: 'Create and reuse inspection templates tailored to different property types.',
    },
    {
      icon: <FileText className="h-6 w-6 text-primary-600" />,
      title: 'Professional Reports',
      description: 'Generate branded inspection reports with comprehensive documentation.',
    },
    {
      icon: <Shield className="h-6 w-6 text-primary-600" />,
      title: 'Liability Protection',
      description: 'Protect your business with thorough inspection documentation.',
    },
  ];

  const testimonials = [
    {
      quote: "scopoStay has revolutionized our check-in process. The AI damage detection has saved us countless disputes with guests.",
      author: "Sarah Johnson",
      role: "Short-term Rental Host",
      image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150",
    },
    {
      quote: "As a property manager handling multiple units, the inspection templates and reports are invaluable. Highly recommend!",
      author: "Michael Chen",
      role: "Property Manager",
      image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",
    },
    {
      quote: "The platform has streamlined our operations and reduced damages by 30%. The ROI is clear within the first month.",
      author: "Rebecca Torres",
      role: "Real Estate Agent",
      image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150",
    },
  ];

  // Convert Stripe products to pricing tiers for display
  const pricingTiers = Object.entries(STRIPE_PRODUCTS).map(([key, product]) => ({
    id: key,
    name: product.name,
    price: product.price,
    description: product.description,
    features: product.features,
    popular: product.popular || false,
  }));

  return (
    <div className="bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <Building2 className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-2xl font-bold text-gray-900">scopoStay</span>
              </Link>
              
              <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                <a href="#features" className="border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium">
                  Features
                </a>
                <a href="#pricing" className="border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium">
                  Pricing
                </a>
                <a href="#testimonials" className="border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium">
                  Testimonials
                </a>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button>Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="secondary">Log in</Button>
                    </Link>
                    <Link to="/register">
                      <Button>Start Free Trial</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <a
                href="#features"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Testimonials
              </a>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="space-y-2 px-4">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button fullWidth>Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="secondary" fullWidth>Log in</Button>
                    </Link>
                    <Link to="/register">
                      <Button fullWidth>Start Free Trial</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Hero section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <svg
              className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-white transform translate-x-1/2"
              fill="currentColor"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon points="50,0 100,0 50,100 0,100" />
            </svg>
            
            <main className="pt-10 mx-auto max-w-7xl px-4 sm:pt-12 sm:px-6 md:pt-16 lg:pt-20 lg:px-8 xl:pt-28">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="sm:text-center lg:text-left"
              >
                <motion.h1
                  variants={itemVariants}
                  className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl"
                >
                  <span className="block">Simplify property</span>
                  <span className="block text-primary-600">inspections with AI</span>
                </motion.h1>
                <motion.p
                  variants={itemVariants}
                  className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0"
                >
                  Document property conditions, detect damages, and generate professional reports for your short-term rentals and real estate properties.
                </motion.p>
                <motion.div
                  variants={itemVariants}
                  className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start"
                >
                  <div className="rounded-md shadow">
                    <Link to="/register">
                      <Button size="lg" className="w-full">
                        Start your free trial
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a href="#features">
                      <Button variant="secondary" size="lg" className="w-full">
                        Learn more
                      </Button>
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Property inspection"
          />
        </div>
      </div>
      
      {/* Features section */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Streamline your property inspections
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Save time, reduce disputes, and protect your property investments with our comprehensive inspection platform.
            </p>
          </div>
          
          <div className="mt-20">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4"
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={itemVariants} className="relative">
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-primary-50">
                    {feature.icon}
                  </div>
                  <p className="ml-16 text-lg font-medium text-gray-900">{feature.title}</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Pricing section */}
      <div id="pricing" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-base font-semibold text-primary-600 tracking-wide uppercase">Pricing</h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-center">
              Plans for businesses of all sizes
            </p>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4 lg:text-center">
              Choose the perfect plan for your property portfolio with our flexible subscription options.
            </p>
          </div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="mt-16 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8"
          >
            {pricingTiers.map((tier, index) => (
              <motion.div 
                key={tier.id}
                variants={itemVariants}
                className={`relative flex flex-col rounded-2xl shadow-lg overflow-hidden ${
                  tier.popular ? 'border-2 border-primary-500 lg:scale-105' : 'border border-gray-200'
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 text-sm font-medium">
                    Popular
                  </div>
                )}
                <div className="px-6 py-8 bg-white">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {tier.name}
                    </h3>
                    <p className="mt-2 text-gray-500 text-sm">{tier.description}</p>
                    <p className="mt-4">
                      <span className="text-4xl font-extrabold text-gray-900">${tier.price}</span>
                      <span className="text-base font-medium text-gray-500">/month</span>
                    </p>
                    <Link to="/register">
                      <Button
                        variant={tier.popular ? 'default' : 'secondary'}
                        className="mt-6 w-full"
                      >
                        Start free trial
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 px-6 pt-6 pb-8">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                    What's included
                  </h4>
                  <ul className="mt-6 space-y-4">
                    {tier.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex">
                        <Check className="flex-shrink-0 h-5 w-5 text-success-500" />
                        <span className="ml-3 text-base text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Testimonials section */}
      <div id="testimonials" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-primary-600 tracking-wide uppercase">Testimonials</h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Trusted by property professionals
            </p>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Hear from our customers who have transformed their property inspection process.
            </p>
          </div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="mt-20 grid gap-8 lg:grid-cols-3"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="bg-white rounded-lg shadow-md p-8 border border-gray-200"
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.author} 
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900">{testimonial.author}</h4>
                    <p className="text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.quote}"</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* CTA section */}
      <div className="bg-primary-700">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 lg:py-24 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to streamline your inspections?</span>
            <span className="block text-primary-200">Start your 14-day free trial today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-white text-primary-700 hover:bg-gray-50 focus:ring-offset-primary-700"
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link to="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-primary-600 text-white hover:bg-primary-500 focus:ring-offset-primary-700"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-bold text-white">scopoStay</span>
              </div>
              <p className="mt-4 text-base text-gray-300">
                Simplify your property inspections with AI-powered damage detection and professional reports.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Company</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#" className="text-base text-gray-300 hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-base text-gray-300 hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-base text-gray-300 hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#" className="text-base text-gray-300 hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-base text-gray-300 hover:text-white">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              <a href="#" className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
            <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
              &copy; {new Date().getFullYear()} scopoStay. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;