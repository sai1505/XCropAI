import os
from app.core.supabase_client import supabase


class UserRepository:

    def save_analysis(self, user_id: str, data: dict) -> str:
        """Inserts the record into user_chats using Storage PATHS."""
        insert_data = {
            "user_id": user_id,
            "user_email": data["email"],
            "title": data["name"],
            "disease_name": (
                [data["disease_name"]]
                if isinstance(data["disease_name"], str)
                else data["disease_name"]
            ),
            "main_image": data["image_paths"]["original"],
            "derived_images": {
                "enhanced": data["image_paths"]["enhanced"],
                "thermal": data["image_paths"]["thermal"],
            },
            "analysis": {
                "stats": data["stats"],
                "llm_analysis": data["llm_analysis"],
                "prevention": data["prevention"],
            },
            "chat": [],
        }
        res = supabase.table("user_chats").insert(insert_data).execute()
        return res.data[0]["id"]

    # --- History & Analytics ---
    def fetch_user_history(self, user_id: str):
        return (
            supabase.table("user_chats")
            .select("id, title, created_at, disease_name")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

    def update_chat_history(self, chat_id: str, user_id: str, new_messages: list):
        return (
            supabase.table("user_chats")
            .update({"chat": new_messages, "updated_at": "now()"})
            .eq("id", chat_id)
            .eq("user_id", user_id)
            .execute()
        )

    def fetch_chat_by_id(self, user_id: str, chat_id: str):
        """Pure DB logic: Get the raw row from Supabase."""
        return (
            supabase.table("user_chats")
            .select("*")
            .eq("id", chat_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

    def delete_chat(self, user_id: str, chat_id: str):
        return (
            supabase.table("user_chats")
            .delete()
            .eq("id", chat_id)
            .eq("user_id", user_id)
            .execute()
        )

    # --- Profile ---
    def fetch_profile(self, user_id: str):
        return (
            supabase.table("profile").select("*").eq("id", user_id).single().execute()
        )

    def update_profile(self, user_id: str, updates: dict):
        return supabase.table("profile").update(updates).eq("id", user_id).execute()

    # --- Storage Helpers ---
    def upload_file(
        self, user_id: str, timestamp: int, label: str, local_path: str
    ) -> str:
        """Uploads a local file directly to the private 'chat_images' bucket."""
        file_extension = os.path.splitext(local_path)[1]
        storage_path = f"{user_id}/{timestamp}_{label}{file_extension}"

        with open(local_path, "rb") as f:
            supabase.storage.from_("chat_images").upload(
                path=storage_path, file=f, file_options={"content-type": "image/png"}
            )
        return storage_path

    def get_signed_url(self, path: str):
        """Generates a 1-hour signed URL for private bucket access."""
        if not path:
            return None
        res = supabase.storage.from_("chat_images").create_signed_url(path, 3600)
        return res.get("signedURL")

    @staticmethod
    def get_user_profile(user_id: str):
        res = supabase.table("profile").select("*").eq("id", user_id).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def create_user_profile(user_id: str, email: str, user_payload: dict):
        # Extract name with fallbacks
        metadata = user_payload.get("user_metadata", {})
        display_name = (
            metadata.get("display_name")
            or metadata.get("full_name")
            or metadata.get("name")
            or email.split("@")[0]
        )

        data = {
            "id": user_id,
            "email": email,
            "display_name": display_name,
            "role": "Farmer",  # Default starting role
        }

        return supabase.table("profile").insert(data).execute()
