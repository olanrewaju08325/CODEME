DO $$ 
DECLARE 
  new_student_id TEXT; 
  v_email TEXT := 'test_diag_email@gmail.com'; 
  v_id UUID := gen_random_uuid(); 
BEGIN 
  new_student_id := 'CDM25' || lpad(nextval('public.student_id_seq')::text, 4, '0'); 
  INSERT INTO public.profiles (id, student_id, full_name, role, email) 
  VALUES (v_id, new_student_id, '', 'student', v_email); 
END; 
$$;
