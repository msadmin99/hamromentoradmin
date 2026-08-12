import { apiFetch, uploadFields } from "./api";

/**
 * Uploads a File through the validated/deduped/optimized media pipeline
 * (POST /media/upload/) and polls GET /media/<id>/ until the async variant
 * generation finishes. Throws on validation failure or processing failure/timeout.
 */
export async function uploadAndProcessImage(file, imageType, category = "other") {
  const created = await uploadFields("/media/upload/", "POST", { file, image_type: imageType, category });
  if (created.processing_status === "ready") return created;

  let asset = created;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    asset = await apiFetch(`/media/${created.id}/`, { method: "GET" });
    if (asset.processing_status === "ready" || asset.processing_status === "failed") break;
  }
  if (asset.processing_status !== "ready") {
    throw new Error(asset.processing_error || "Image processing failed or timed out — try again.");
  }
  return asset;
}

/**
 * Given a question-form object (image/explanation_image/options[].image
 * possibly holding raw File objects picked via ImagePicker), uploads each
 * File through the media pipeline and PATCHes the resulting MediaAsset ids
 * onto the question via /questions/<id>/upload_images/. Fields that are
 * already a URL string (existing image, unchanged) or null are skipped.
 */
export async function uploadQuestionImages(api, questionId, questionForm) {
  const patchFields = {};

  if (questionForm.image instanceof File) {
    const asset = await uploadAndProcessImage(questionForm.image, "question_image", questionForm.image_category || "other");
    patchFields.image_asset_id = asset.id;
  }
  if (questionForm.explanation_image instanceof File) {
    const asset = await uploadAndProcessImage(
      questionForm.explanation_image, "explanation_image", questionForm.explanation_image_category || "other",
    );
    patchFields.explanation_image_asset_id = asset.id;
  }
  for (let i = 0; i < (questionForm.options || []).length; i++) {
    const opt = questionForm.options[i];
    if (opt.image instanceof File) {
      const asset = await uploadAndProcessImage(opt.image, "option_image", opt.image_category || "other");
      patchFields[`option_image_asset_id_${i}`] = asset.id;
    }
  }

  if (Object.keys(patchFields).length === 0) return;
  await api.patch(`/questions/${questionId}/upload_images/`, patchFields);
}
