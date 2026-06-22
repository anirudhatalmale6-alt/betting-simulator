'use client';

import { useState } from 'react';

const PHONE_NUMBER = '';
const PHONE_DISPLAY = '';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const smsBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nMessage: ${message}`);
    window.open(`sms:${PHONE_NUMBER}?body=${smsBody}`, '_self');
    setSent(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-gray-400 mb-8">Have a question or need help? Reach out to us anytime.</p>

      <div className="grid gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <h2 className="text-lg font-semibold">Text Us</h2>
              <p className="text-sm text-gray-400">Send us a text message directly</p>
            </div>
          </div>
          {PHONE_NUMBER ? (
            <>
              <div className="text-2xl font-bold text-emerald-400 mb-4">{PHONE_DISPLAY}</div>
              <a
                href={`sms:${PHONE_NUMBER}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Send a Text
              </a>
            </>
          ) : (
            <p className="text-gray-500 italic">Phone number coming soon</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-2xl">
              📞
            </div>
            <div>
              <h2 className="text-lg font-semibold">Call Us</h2>
              <p className="text-sm text-gray-400">Give us a call anytime</p>
            </div>
          </div>
          {PHONE_NUMBER ? (
            <>
              <div className="text-2xl font-bold text-emerald-400 mb-4">{PHONE_DISPLAY}</div>
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Now
              </a>
            </>
          ) : (
            <p className="text-gray-500 italic">Phone number coming soon</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-2xl">
              🟢
            </div>
            <div>
              <h2 className="text-lg font-semibold">Live Chat</h2>
              <p className="text-sm text-gray-400">Chat with us in real time</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Click the chat bubble in the bottom-right corner of the screen to start a live chat with our support team.
          </p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Send Us a Message</h2>
        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-emerald-400 font-medium text-lg">Message ready to send!</p>
            <p className="text-gray-400 text-sm mt-1">Your messaging app should have opened with the message.</p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                placeholder="How can we help you?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
