import React, { useState } from 'react';
import { BellIcon, PillIcon, ArrowRightIcon, CheckIcon } from '../components/Icons';
import { Sun, Brain, Mic, Bot } from 'lucide-react';

export function HomeView({
  patient,
  nextReminder,
  onStartQuiz,
  onCompleteReminder,
  onViewMemories,
  onOpenCompanion
}) {
  const [reminderDone, setReminderDone] = useState(nextReminder?.completed || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkDone = async () => {
    if (reminderDone || isProcessing) return;
    setIsProcessing(true);
    try {
      if (nextReminder?.id) {
        await onCompleteReminder(nextReminder.id);
      }
      setReminderDone(true);
    } catch (err) {
      console.error(err);
      setReminderDone(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="home-view-container animate-fade-in">
      {/* 1. Greeting Section */}
      <section className="greeting-section">
        <span className="greeting-prefix">Good Morning,</span>
        <h1 className="greeting-name">
          {patient?.preferred_name || patient?.name || 'Friend'}{' '}
          <Sun size={26} color="#F59E0B" style={{ display: 'inline-block', verticalAlign: '-4px', marginLeft: 4 }} />
        </h1>
        <p className="greeting-sub">A brighter day for a healthier you.</p>
      </section>

      {/* Voice Companion Card */}
      <section
        onClick={onOpenCompanion}
        className="smriti-card card-companion clickable"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpenCompanion && onOpenCompanion()}
        aria-label="Talk with Smriti Companion"
      >
        <div className="card-companion-content">
          <span className="card-tag tag-companion">VOICE AI COMPANION</span>
          <h2 className="card-title title-companion">
            Talk with<br />Smriti
          </h2>
          <p className="card-sub sub-companion">
            Gentle conversations, memories & voice companionship
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCompanion) onOpenCompanion();
            }}
            className="card-btn btn-companion"
            aria-label="Start Voice Conversation"
          >
            <Mic size={18} className="btn-mic-icon" />
            <span>Talk Now</span>
          </button>
        </div>

        <div className="card-companion-mascot-wrapper">
          <div className="companion-mascot-circle">
            <Bot size={44} color="#047857" />
          </div>
        </div>
      </section>

      {/* 2. Card 1: Active Mind Game Card */}
      <section className="smriti-card card-game">
        <div className="card-game-content">
          <span className="card-tag tag-game">KEEP YOUR MIND ACTIVE</span>
          <h2 className="card-title title-game">
            Play a Game<br />Today
          </h2>
          <p className="card-sub sub-game">
            Fun games to boost<br />your memory
          </p>

          <button
            onClick={onStartQuiz}
            className="card-btn btn-game"
            aria-label="Start Playing Brain Boost"
          >
            <span>Start Playing</span>
            <ArrowRightIcon className="btn-arrow-icon" />
          </button>
        </div>

        {/* Brain Mascot Illustration */}
        <div className="card-game-mascot-wrapper">
          <img
            src="/brain_mascot.png"
            alt="Friendly Brain Mascot"
            className="mascot-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="mascot-fallback" style={{ display: 'none' }}>
            <Brain size={42} color="#166534" />
          </div>
        </div>
      </section>

      {/* 3. Card 2: Next Reminder Card */}
      <section className="smriti-card card-reminder">
        <div className="reminder-header">
          <span className="card-tag tag-reminder">NEXT REMINDER</span>
          <button className="reminder-bell-btn" aria-label="Reminder notification">
            <BellIcon className="bell-icon" />
          </button>
        </div>

        <div className="reminder-body">
          <div className="reminder-icon-circle">
            <PillIcon className="pill-badge-icon" />
          </div>
          <div className="reminder-info">
            <h3 className="reminder-title">{nextReminder?.title || 'Take Medicine'}</h3>
            <span className="reminder-time">{nextReminder?.scheduled_time || 'Today, 9:00 AM'}</span>
          </div>
        </div>

        {/* Mark as Done Button */}
        <button
          onClick={handleMarkDone}
          disabled={reminderDone || isProcessing}
          className={`card-btn btn-reminder ${reminderDone ? 'done' : ''}`}
          aria-label={reminderDone ? 'Reminder completed' : 'Mark reminder as done'}
        >
          {reminderDone ? (
            <>
              <CheckIcon className="check-icon" />
              <span>Done for Today!</span>
            </>
          ) : (
            <span>{isProcessing ? 'Updating...' : 'Mark as Done'}</span>
          )}
        </button>
      </section>

      {/* 4. Card 3: Memories Card */}
      <section
        onClick={onViewMemories}
        className="smriti-card card-memories clickable"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onViewMemories()}
        aria-label="View Your Memories"
      >
        <div className="card-memories-content">
          <span className="card-tag tag-memories">YOUR MEMORIES</span>
          <h2 className="card-title title-memories">
            View Your<br />Memories
          </h2>
          <p className="card-sub sub-memories">
            Look at photos, stories<br />and special moments
          </p>
        </div>

        {/* Polaroids Graphic Preview */}
        <div className="card-memories-preview">
          <img
            src="/memories_thumb.png"
            alt="Memories Preview"
            className="polaroid-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="polaroid-fallback" style={{ display: 'none' }}>
            <div className="mini-polaroid polaroid-back"></div>
            <div className="mini-polaroid polaroid-front">
              <span className="polaroid-sun"><Sun size={18} color="#F59E0B" /></span>
              <div className="polaroid-hills"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
