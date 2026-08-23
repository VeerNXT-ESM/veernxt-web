# Gemini API & Image Generation Cost Estimation

This document provides a cost projection for reformatting the VeerNXT book library (44 unique books, 783 chapters) using the Gemini API for text enrichment and AI image generation.

## 1. Text Reformatting (Gemini 3.6 Flash)

*   **Total unique books:** 44
*   **Total chapters:** 783
*   **Average chapter length:** 4,000 to 5,000 words
*   **Token conversion factor:** ~1.33 tokens per word (plus structural JSON wrapping overhead)
*   **Estimated tokens per chapter:**
    *   **Input:** ~6,700 tokens
    *   **Output (JSON response):** ~7,300 tokens
*   **Pricing (Gemini 3.6 Flash):**
    *   Input: **$0.75 / 1M tokens**
    *   Output: **$3.75 / 1M tokens**

### Cost Breakdown:
*   **Total Input Tokens:** $783 \times 6,700 \approx 5.25\text{M tokens}$
    *   *Input Cost:* $5.25\text{M} \times \$0.75 = \$3.94\text{ USD}$
*   **Total Output Tokens:** $783 \times 7,300 \approx 5.72\text{M tokens}$
    *   *Output Cost:* $5.72\text{M} \times \$3.75 = \$21.45\text{ USD}$
*   **Total Text Reformatting Cost:** **~$25.39 USD** (Expected range: **$20.00 – $35.00 USD** depending on exact word counts)

---

## 2. AI Image Generation (Imagen 4 / Vertex AI)

If the pipeline is updated to generate custom contextual illustrations for chapters:

*   **Pricing:** ~$0.03 USD per generated image
*   **1 Image per Chapter (783 images):** $783 \times \$0.03 = \mathbf{\$23.49\text{ USD}}$
*   **2 Images per Chapter (1,500 images):** $1500 \times \$0.03 = \mathbf{\$45.00\text{ USD}}$

---

## 3. Total Project Estimate & Recommendation

| Component | Lower Estimate | Upper Estimate |
| :--- | :--- | :--- |
| Text Enrichment (Gemini 3.6 Flash) | $20.00 USD | $35.00 USD |
| Image Generation (1–2 per chapter) | $25.00 USD | $45.00 USD |
| **Total Project Cost** | **$45.00 USD** | **$80.00 USD** |

### Action Item
Please add **$50.00 to $100.00 USD** of prepayment credits to your Google AI Studio account (or provide an active API key with pre-funded billing enabled) to safely run the batch processing script without running into `429 RESOURCE_EXHAUSTED` limits.
