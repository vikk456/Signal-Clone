"""
Seed script — populates the database with realistic Signal-like demo data.
Run: python seed.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, User, Conversation, ConversationMember, Message, Contact, MessageReaction
from auth import get_password_hash
import random

Base.metadata.create_all(bind=engine)


USERS = [
    {
        "phone_number": "+1 (555) 001-0001",
        "username": "alice",
        "display_name": "Alice Johnson",
        "bio": "Privacy advocate. Signal evangelist. 📱",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
        "password": "password123",
    },
    {
        "phone_number": "+1 (555) 001-0002",
        "username": "bob",
        "display_name": "Bob Martinez",
        "bio": "Software engineer. Coffee addict ☕",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
        "password": "password123",
    },
    {
        "phone_number": "+1 (555) 001-0003",
        "username": "carol",
        "display_name": "Carol Chen",
        "bio": "Designer & creative thinker 🎨",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
        "password": "password123",
    },
    {
        "phone_number": "+1 (555) 001-0004",
        "username": "david",
        "display_name": "David Kim",
        "bio": "DevOps | Cloud | Linux 🐧",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
        "password": "password123",
    },
    {
        "phone_number": "+1 (555) 001-0005",
        "username": "emma",
        "display_name": "Emma Wilson",
        "bio": "Product Manager at TechCorp 🚀",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
        "password": "password123",
    },
    {
        "phone_number": "+1 (555) 001-0006",
        "username": "frank",
        "display_name": "Frank Liu",
        "bio": "Data scientist. Python lover 🐍",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=frank",
        "password": "password123",
    },
]

DM_CONVERSATIONS = [
    # (user_a_idx, user_b_idx, messages)
    (0, 1, [
        (0, "Hey Bob! Did you check out the new Signal update?", -120),
        (1, "Yeah! The new privacy features are solid. Really impressed.", -115),
        (0, "I know right? The disappearing messages feature is 🔥", -110),
        (1, "Absolutely. Hey, are you free this weekend?", -100),
        (0, "Should be! What did you have in mind?", -95),
        (1, "Thinking of organizing a small dev meetup. You interested?", -90),
        (0, "100%! Count me in. Where are you thinking?", -85),
        (1, "Maybe the coworking space downtown? They have a great meeting room.", -80),
        (0, "Perfect. I'll bring my laptop for demos 💻", -75),
        (1, "Awesome! I'll set up a poll for the timing. Probably Saturday afternoon?", -70),
        (0, "Works for me! Looking forward to it 🎉", -5),
    ]),
    (0, 2, [
        (2, "Alice! I just finished the mockups for the dashboard redesign.", -200),
        (0, "Oh nice! Can you share them? Super curious to see.", -195),
        (2, "Sending over now... Let me know what you think!", -190),
        (0, "These look amazing Carol! The color palette is perfect.", -185),
        (2, "Thanks! I was going for a cleaner, more minimal vibe.", -180),
        (0, "You nailed it. The typography choices are chef's kiss 🤌", -175),
        (2, "Haha thanks! The team seemed to like it too.", -160),
        (0, "Can you do a light and dark version?", -155),
        (2, "Already on it! Should have both by tomorrow.", -150),
        (0, "You're the best 🙌", -10),
    ]),
    (0, 3, [
        (3, "Alice, the deployment pipeline broke again 😤", -300),
        (0, "Ugh, what happened this time?", -298),
        (3, "Container health checks failing on the staging env. Logs are a mess.", -295),
        (0, "Did you check the environment variables? Sometimes they get reset.", -290),
        (3, "Oh good call... checking now", -285),
        (3, "YOU ARE A GENIUS. That was exactly it.", -280),
        (0, "Ha! Classic Docker env issue. Always check envs first 😄", -270),
        (3, "I owe you a coffee ☕", -265),
        (0, "I'll hold you to that!", -260),
        (3, "Deployment successful! All green ✅", -30),
    ]),
    (1, 2, [
        (1, "Carol! Loved the new design. Really clean work.", -400),
        (2, "Thanks Bob! Alice shared it with you?", -398),
        (1, "She did! The landing page especially looks premium.", -395),
        (2, "That was the tricky part. Spent hours on the hero section.", -390),
        (1, "It paid off. One question — did you use Figma or Sketch?", -385),
        (2, "Figma all the way. Sketch feels outdated now tbh.", -380),
        (1, "Fair point. I should learn Figma properly.", -375),
        (2, "I can give you a walkthrough sometime! It's not too complex.", -370),
        (1, "That'd be great! Let me know when.", -15),
    ]),
    (0, 4, [
        (4, "Hey Alice! Quick question about the Q3 roadmap.", -50),
        (0, "Sure! What's up Emma?", -48),
        (4, "Are we still planning the real-time messaging feature for Q3?", -45),
        (0, "Yes! It's high priority. We're using WebSockets.", -42),
        (4, "Great! I'll update the product board. Stakeholders keep asking.", -38),
        (0, "Tell them it's on track. Should be done by end of month.", -35),
        (4, "Perfect. Thanks for the update! 🙏", -8),
    ]),
]

GROUP_CONVERSATIONS = [
    {
        "name": "🚀 Engineering Team",
        "description": "Where the magic happens",
        "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=engineering",
        "members": [0, 1, 3, 5],
        "admin": 0,
        "messages": [
            (1, "Morning everyone! Sprint planning in 30 mins?", -480),
            (3, "I'll be there. Just finishing up the CI config.", -475),
            (5, "On my way. Grabbing coffee first ☕", -470),
            (0, "See you all in the standup channel!", -465),
            (1, "David, did you push the hotfix for the auth bug?", -400),
            (3, "Pushed and merged ✅ PR #247", -395),
            (0, "Nice! Deployed to prod. Monitoring now.", -390),
            (5, "Response times look good. P99 is 87ms 🎯", -385),
            (1, "Let's ship the new feature branch tomorrow morning", -300),
            (3, "LGTM. I'll do a final review tonight.", -295),
            (0, "Great work team! Ping me if anything breaks 🙏", -200),
            (5, "All systems nominal. We're good to go 🚀", -100),
            (3, "Reminder: architecture review at 3pm today", -60),
            (1, "I'll prepare the deck. 15 min presentation?", -55),
            (0, "Sounds good. Keep it tight!", -30),
        ],
    },
    {
        "name": "🎨 Design & Product",
        "description": "Design reviews and product discussions",
        "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=design",
        "members": [0, 2, 4],
        "admin": 4,
        "messages": [
            (2, "Posted the updated wireframes in Figma. Link in pinned messages.", -600),
            (4, "Just reviewed! The user flow looks much cleaner now.", -595),
            (0, "The onboarding redesign is exactly what we needed.", -590),
            (2, "Thanks! I used Nielsen's heuristics as a guide.", -585),
            (4, "Carol, can you do a quick walkthrough in tomorrow's sync?", -580),
            (2, "Absolutely! I'll screen share the Figma prototype.", -575),
            (0, "Reminder: user testing sessions start next Monday.", -400),
            (4, "I've recruited 8 participants. All confirmed!", -395),
            (2, "Perfect. I'll prep the test script today.", -300),
            (4, "Alice, can you join as an observer for at least 2 sessions?", -280),
            (0, "Yes! Mark me for Tuesday and Thursday sessions.", -275),
            (2, "Added! This is going to be really insightful 🔍", -200),
            (4, "User testing results are in! 87% task completion rate 🎉", -50),
            (0, "That's excellent! What were the pain points?", -45),
            (2, "Main issue was the settings menu. I have solutions ready.", -40),
        ],
    },
    {
        "name": "🍕 Lunch Crew",
        "description": "Where we decide what to eat",
        "avatar": "https://api.dicebear.com/7.x/identicon/svg?seed=lunch",
        "members": [0, 1, 2, 3, 4, 5],
        "admin": 1,
        "messages": [
            (1, "Lunch today? 🍜", -180),
            (2, "Yes! That Thai place?", -175),
            (3, "I'm in! Haven't had Thai in a while.", -170),
            (4, "Count me in! Should we book?", -165),
            (0, "Let's meet at 12:30?", -160),
            (5, "Perfect, see you all there!", -155),
            (2, "Just arrived. Got a table for 6 🙌", -90),
            (1, "On my way, 5 mins!", -85),
            (3, "The pad thai here is insane 😍", -45),
            (0, "Right? Best in the city honestly.", -40),
            (5, "We should make this a weekly thing!", -35),
            (1, "Weekly Lunch Crew it is! Same time next week?", -10),
            (4, "Deal! I'll send a calendar invite 📅", -5),
        ],
    },
]


def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("[SEED] Seeding database...")

        # Create users
        users = []
        for i, u_data in enumerate(USERS):
            user = User(
                phone_number=u_data["phone_number"],
                username=u_data["username"],
                display_name=u_data["display_name"],
                bio=u_data["bio"],
                avatar_url=u_data["avatar_url"],
                password_hash=get_password_hash(u_data["password"]),
                is_online=i < 3,  # first 3 users are "online"
                last_seen=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),
            )
            db.add(user)
        db.flush()
        users = db.query(User).all()
        print(f"  [OK] Created {len(users)} users")

        # Create contacts (alice knows everyone)
        for i in range(1, len(users)):
            db.add(Contact(owner_id=users[0].id, contact_id=users[i].id))
            db.add(Contact(owner_id=users[i].id, contact_id=users[0].id))
        db.flush()
        print(f"  [OK] Created contacts")

        # Create DM conversations
        for user_a_idx, user_b_idx, msgs in DM_CONVERSATIONS:
            conv = Conversation(
                is_group=False,
                created_by=users[user_a_idx].id,
                created_at=datetime.utcnow() - timedelta(hours=10),
            )
            db.add(conv)
            db.flush()

            db.add(ConversationMember(conversation_id=conv.id, user_id=users[user_a_idx].id, is_admin=True))
            db.add(ConversationMember(conversation_id=conv.id, user_id=users[user_b_idx].id, is_admin=False))
            db.flush()

            for sender_idx, content, minutes_ago in msgs:
                msg_user_idx = user_a_idx if sender_idx == 0 else (user_b_idx if sender_idx == user_b_idx else sender_idx)
                # Determine actual sender
                if sender_idx == 0:
                    actual_sender = users[user_a_idx]
                elif sender_idx == 1:
                    actual_sender = users[user_b_idx]
                else:
                    actual_sender = users[sender_idx]

                msg = Message(
                    conversation_id=conv.id,
                    sender_id=actual_sender.id,
                    content=content,
                    status="read",
                    created_at=datetime.utcnow() + timedelta(minutes=minutes_ago),
                )
                db.add(msg)
            db.flush()

        print(f"  [OK] Created {len(DM_CONVERSATIONS)} DM conversations")

        # Create group conversations
        for g_data in GROUP_CONVERSATIONS:
            conv = Conversation(
                is_group=True,
                group_name=g_data["name"],
                group_avatar=g_data["avatar"],
                group_description=g_data["description"],
                created_by=users[g_data["admin"]].id,
                created_at=datetime.utcnow() - timedelta(days=7),
            )
            db.add(conv)
            db.flush()

            for i, member_idx in enumerate(g_data["members"]):
                db.add(ConversationMember(
                    conversation_id=conv.id,
                    user_id=users[member_idx].id,
                    is_admin=(member_idx == g_data["admin"]),
                    joined_at=datetime.utcnow() - timedelta(days=7),
                ))
            db.flush()

            for sender_idx, content, minutes_ago in g_data["messages"]:
                actual_sender = users[g_data["members"][
                    g_data["members"].index(sender_idx) if sender_idx in g_data["members"] else 0
                ]]
                msg = Message(
                    conversation_id=conv.id,
                    sender_id=actual_sender.id,
                    content=content,
                    status="read",
                    created_at=datetime.utcnow() + timedelta(minutes=minutes_ago),
                )
                db.add(msg)
            db.flush()

        print(f"  [OK] Created {len(GROUP_CONVERSATIONS)} group conversations")

        db.commit()
        print("\n[DONE] Seeding complete!")
        print("\n[INFO] Test Accounts (all use password: 'password123'):")
        for u in USERS:
            print(f"   - {u['display_name']} | username: {u['username']} | phone: {u['phone_number']}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
