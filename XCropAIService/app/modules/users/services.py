from app.modules.users.repository import UserRepository
from fastapi import HTTPException

repo = UserRepository()


def get_chat_session_service(user_id: str, chat_id: str):
    """
    Fetches a specific chat and prepares it for the frontend
    by generating signed URLs for private storage images.
    """
    res = repo.fetch_chat_by_id(user_id, chat_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Analysis session not found")

    data = res.data

    # Transform raw paths into temporary Signed URLs
    images = {
        "original": repo.get_signed_url(data.get("main_image")),
        "enhanced": repo.get_signed_url(data.get("derived_images", {}).get("enhanced")),
        "thermal": repo.get_signed_url(data.get("derived_images", {}).get("thermal")),
    }

    return {
        "id": data["id"],
        "title": data["title"],
        "disease_name": data.get("disease_name"),
        "images": images,
        "analysis": data.get("analysis"),
        "chat": data.get("chat", []),
    }


def get_analytics_service(user_id: str, chat_id: str):
    res = repo.fetch_chat_by_id(user_id, chat_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Analytics data not found")
    return res.data.get("analysis", {}).get("stats")


def get_user_images_service(user_id: str):
    """
    Optimized: Fetches all user history and maps paths to URLs
    without extra database queries inside the loop.
    """
    # Note: Ensure fetch_user_history selects main_image and derived_images
    # in your repository if you want to avoid the N+1 query.
    chats = repo.fetch_user_history(user_id).data or []
    results = []

    for chat in chats:
        # Check if history already contains the paths, otherwise fetch full
        # If your repo select is "id, title, created_at", you need full_chat:
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
        res = repo.update_profile(user_id, updates)
        return res.data
    res = repo.fetch_profile(user_id)
    return res.data


def verify_profile_service(user_payload: dict):
    user_id = user_payload["sub"]
    email = user_payload.get("email")

    profile = repo.get_user_profile(user_id)

    if not profile:
        repo.create_user_profile(user_id, email, user_payload)
        profile = repo.get_user_profile(user_id)

    return {"status": "ok", "profile": profile}
