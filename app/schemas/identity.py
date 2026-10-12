import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


# Approved catalog taxonomy constants (Strict server-side validation)
APPROVED_PRESETS = {
    "scholar", "innovator", "creator", "strategist", 
    "vanguard", "nomad", "luminary", "sentinel"
}
APPROVED_SKIN_TONES = {
    "amber", "golden", "espresso", "bronze", 
    "porcelain", "chestnut", "mocha", "hazel"
}
APPROVED_HAIR_STYLES = {
    "short_crop", "curls", "locs", "braids", 
    "bob", "buzz", "high_fade", "flowing", "messy", "topknot"
}
APPROVED_HAIR_COLORS = {
    "midnight", "espresso", "chestnut", "obsidian", 
    "auburn", "honey", "silver", "cosmic_violet", "electric_teal"
}
APPROVED_EXPRESSIONS = {
    "confident", "focused", "friendly", "calm", "joyful", "visionary"
}
APPROVED_FACIAL_FEATURES = {
    "none", "freckles", "light_beard", "goatee", "clean"
}
APPROVED_CLOTHING_STYLES = {
    "academic_blazer", "tech_hoodie", "minimal_knit", 
    "varsity_jacket", "crisp_collared", "lab_coat", "streetwear"
}
APPROVED_CLOTHING_COLORS = {
    "navy", "slate", "emerald", "crimson", 
    "amber", "violet", "monochrome", "cream"
}
APPROVED_ACCESSORIES = {
    "none", "smart_glasses", "headphones", "stud_earring", "scarf", "lapel_pin"
}
APPROVED_BACKGROUNDS = {
    "aurora", "ocean", "dusk", "cyber", "emerald", "obsidian", "sunset", "minimal_gray"
}


class AvatarConfigDTO(BaseModel):
    """
    Strictly validated Avatar Customization JSON Payload.
    Guarantees no arbitrary HTML/SVG injection and adheres to approved catalogue.
    """
    preset: str = Field(default="scholar")
    skin_tone: str = Field(default="golden")
    hair_style: str = Field(default="curls")
    hair_color: str = Field(default="midnight")
    expression: str = Field(default="confident")
    facial_feature: str = Field(default="none")
    clothing_style: str = Field(default="academic_blazer")
    clothing_color: str = Field(default="navy")
    accessory: str = Field(default="none")
    background: str = Field(default="aurora")

    @field_validator("preset")
    def validate_preset(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_PRESETS:
            raise ValueError(f"Invalid preset '{v}'. Approved: {sorted(list(APPROVED_PRESETS))}")
        return clean

    @field_validator("skin_tone")
    def validate_skin_tone(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_SKIN_TONES:
            raise ValueError(f"Invalid skin tone '{v}'. Approved: {sorted(list(APPROVED_SKIN_TONES))}")
        return clean

    @field_validator("hair_style")
    def validate_hair_style(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_HAIR_STYLES:
            raise ValueError(f"Invalid hair style '{v}'. Approved: {sorted(list(APPROVED_HAIR_STYLES))}")
        return clean

    @field_validator("hair_color")
    def validate_hair_color(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_HAIR_COLORS:
            raise ValueError(f"Invalid hair color '{v}'. Approved: {sorted(list(APPROVED_HAIR_COLORS))}")
        return clean

    @field_validator("expression")
    def validate_expression(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_EXPRESSIONS:
            raise ValueError(f"Invalid expression '{v}'. Approved: {sorted(list(APPROVED_EXPRESSIONS))}")
        return clean

    @field_validator("facial_feature")
    def validate_facial_feature(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_FACIAL_FEATURES:
            raise ValueError(f"Invalid facial feature '{v}'. Approved: {sorted(list(APPROVED_FACIAL_FEATURES))}")
        return clean

    @field_validator("clothing_style")
    def validate_clothing_style(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_CLOTHING_STYLES:
            raise ValueError(f"Invalid clothing style '{v}'. Approved: {sorted(list(APPROVED_CLOTHING_STYLES))}")
        return clean

    @field_validator("clothing_color")
    def validate_clothing_color(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_CLOTHING_COLORS:
            raise ValueError(f"Invalid clothing color '{v}'. Approved: {sorted(list(APPROVED_CLOTHING_COLORS))}")
        return clean

    @field_validator("accessory")
    def validate_accessory(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_ACCESSORIES:
            raise ValueError(f"Invalid accessory '{v}'. Approved: {sorted(list(APPROVED_ACCESSORIES))}")
        return clean

    @field_validator("background")
    def validate_background(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in APPROVED_BACKGROUNDS:
            raise ValueError(f"Invalid background '{v}'. Approved: {sorted(list(APPROVED_BACKGROUNDS))}")
        return clean


class UpdateAvatarRequest(BaseModel):
    display_name: Optional[str] = Field(None, max_length=128)
    avatar_config: Optional[AvatarConfigDTO] = None
    avatar_url: Optional[str] = Field(None, max_length=256)

    @field_validator("avatar_url")
    def validate_avatar_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        clean = value.strip()
        if not re.fullmatch(r"/avatars/(male|female)/avatar-\d{3}\.png", clean):
            raise ValueError("Avatar must use an approved SUTRA avatar image.")
        return clean


class StudentIdentityResponse(BaseModel):
    """
    Public, Non-PII Identity Response DTO.
    Exposes zero internal DB IDs, user emails, phone numbers, or academic transcripts.
    """
    sutra_id: str
    display_name: str
    avatar_config: AvatarConfigDTO
    avatar_url: Optional[str] = None
    collectible_status: Literal["unminted", "pending", "minted", "failed"]
    collectible_token_id: Optional[int] = None
    collectible_tx_hash: Optional[str] = None
    wallet_address: Optional[str] = None
    minted_at: Optional[datetime] = None
    created_at: datetime
    network: str = "Base Sepolia (84532)"
    chain_id: int = 84532
    mint_mode: Literal["onchain", "none"] = "none"
    contract_address: Optional[str] = None
    explorer_url: Optional[str] = None
    onchain_enabled: bool = False
    artwork_url: str
    art_title: str = "Abstract Identity Painting"
    artwork_traits: Dict[str, str] = Field(default_factory=dict)
    collectible_error: Optional[str] = None
    is_test_asset: bool = True
    disclaimer: str = "SUTRA Identity Collectible on Base Sepolia testnet is an educational credential test asset with no monetary value."


class MintNFTRequest(BaseModel):
    wallet_address: Optional[str] = Field(
        None,
        description="EVM recipient address on Base Sepolia (0x...)",
    )

    @field_validator("wallet_address")
    def validate_evm_address(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if not re.match(r"^0x[a-fA-F0-9]{40}$", clean):
            raise ValueError("Invalid EVM wallet address. Must be a valid 42-character 0x-prefixed hex string.")
        return clean.lower()


class NFTMetadataAttribute(BaseModel):
    trait_type: str
    value: str


class NFTMetadataResponse(BaseModel):
    """
    ERC-721 Standard Metadata JSON for SUTRA Identity Collectible.
    Completely zero PII.
    """
    name: str
    description: str
    image: str
    external_url: str
    attributes: List[NFTMetadataAttribute]
