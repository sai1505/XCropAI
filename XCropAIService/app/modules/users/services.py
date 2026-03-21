from app.modules.users.repository import UserRepository

repo = UserRepository()


def get_analytics_service(user_id: str, chat_id: str):
    data = repo.fetch_chat_by_id(user_id, chat_id).data
    return data.get("analysis", {}).get("stats")


def get_user_images_service(user_id: str):
    chats = repo.fetch_user_history(user_id).data
    results = []

    for chat in chats:
        # Fetch the full record to get image paths
        full_chat = repo.fetch_chat_by_id(user_id, chat["id"]).data

        results.append(
            {
                "id": chat["id"],
                "title": chat["title"],
                "created_at": chat["created_at"],
                "urls": {
                    "original": repo.get_signed_url(full_chat.get("main_image")),
                    "enhanced": repo.get_signed_url(
                        full_chat.get("derived_images", {}).get("enhanced")
                    ),
                    "thermal": repo.get_signed_url(
                        full_chat.get("derived_images", {}).get("thermal")
                    ),
                },
            }
        )
    return results


def sync_profile_service(user_id: str, updates: dict = None):
    if updates:
        return repo.update_profile(user_id, updates).data
    return repo.fetch_profile(user_id).data


def verify_profile_service(user_payload: dict):
    user_id = user_payload["sub"]
    email = user_payload.get("email")

    profile = repo.get_user_profile(user_id)

    if not profile:
        print(f"New User Detected: {email}. Creating profile...")
        repo.create_user_profile(user_id, email, user_payload)
        # Fetch the newly created profile
        profile = repo.get_user_profile(user_id)

    return {"status": "ok", "profile": profile}
