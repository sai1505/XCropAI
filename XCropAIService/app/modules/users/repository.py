from app.core.supabase_client import supabase


def get_user_profile(user_id):
    res = supabase.table("profile").select("*").eq("id", user_id).execute()
    return res.data[0] if res.data else None


def create_user_profile(user_id, email, user):
    display_name = (
        user.get("user_metadata", {}).get("display_name")
        or user.get("user_metadata", {}).get("full_name")
        or user.get("user_metadata", {}).get("name")
        or email.split("@")[0]
    )

    return (
        supabase.table("profile")
        .insert(
            {
                "id": user_id,
                "email": email,
                "display_name": display_name,
            }
        )
        .execute()
    )
