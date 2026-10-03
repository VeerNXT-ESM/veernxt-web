// Standalone Duplicate/Delete for the Exams list row menu (ExamsPage.jsx) --
// mirrors ExamEditorPanel.jsx's own handleDuplicate/handleDeleteExam exactly
// (same tables, same cascade order, same "(Copy)"/draft-reset convention) so
// a row can be duplicated or deleted without first selecting it into the
// editor panel. Kept separate from the editor panel's handlers rather than
// shared, since it fetches its own full exam row up front instead of reusing
// in-memory form state. Plain-function file (not lcShared.jsx) so it doesn't
// break that file's Fast Refresh export shape.
export async function duplicateExamRow(supabase, examId) {
  const { data: exam, error: fetchErr } = await supabase.from('lc_exams').select('*').eq('id', examId).single();
  if (fetchErr) throw fetchErr;
  const payload = {
    conducting_body_id: exam.conducting_body_id,
    region_id: exam.region_id,
    name: `${exam.name} (Copy)`,
    category: exam.category,
    category_detail: exam.category_detail,
    website: exam.website,
    thumbnail_template_id: exam.thumbnail_template_id,
    accent_color: exam.accent_color,
    status: 'draft',
  };
  const { data, error } = await supabase.from('lc_exams').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExamRow(supabase, examId) {
  await supabase.from('lc_exam_tags').delete().eq('exam_id', examId);
  await supabase.from('lc_exam_resource_map').delete().eq('exam_id', examId);
  await supabase.from('lc_exam_intro').delete().eq('exam_id', examId);
  await supabase.from('lc_exam_quiz_map').delete().eq('exam_id', examId);
  const { error } = await supabase.from('lc_exams').delete().eq('id', examId);
  if (error) throw error;
}
