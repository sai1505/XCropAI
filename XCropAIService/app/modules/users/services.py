from app.modules.users.repository import (
    get_user_profile,
    create_user_profile,
)


def verify_profile_service(user):
    print("USER PAYLOAD RECEIVED IN SERVICE:", user)
    user_id = user["sub"]
    email = user.get("email")

    profile = get_user_profile(user_id)

    if not profile:
        create_user_profile(user_id, email, user)

    return {"status": "ok"}
