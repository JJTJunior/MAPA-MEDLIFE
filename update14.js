const fs = require('fs');

function updateModal() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Add validation again
  const validation = `    if (!formData.status || formData.status.trim() === '') {
      alert('Por favor, selecione o status do agendamento.');
      return;
    }`;
  
  const validationWithCarater = `    if (!formData.status || formData.status.trim() === '') {
      alert('Por favor, selecione o status do agendamento.');
      return;
    }

    if (!formData.carater || formData.carater.trim() === '') {
      alert('Por favor, selecione o caráter da cirurgia (Eletiva, Urgência ou Judicial).');
      return;
    }`;

  if (!content.includes('selecione o caráter da cirurgia')) {
    content = content.replace(validation, validationWithCarater);
  }

  // Find surgery_type field end
  const stField = `                {formData.surgery_type && !surgeryTypesList.find(st => st.name === formData.surgery_type) && (
                  <option value={formData.surgery_type}>{formData.surgery_type} (Legado)</option>
                )}
              </select>
            </div>`;

  const caraterField = `                {formData.surgery_type && !surgeryTypesList.find(st => st.name === formData.surgery_type) && (
                  <option value={formData.surgery_type}>{formData.surgery_type} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Caráter *</label>
              <select
                name="carater"
                className="form-input"
                required
                disabled={!isFieldEditable('carater')}
                value={formData.carater}
                onChange={handleChange}
              >
                <option value="">Selecione...</option>
                <option value="ELETIVA">ELETIVA</option>
                <option value="URGÊNCIA">URGÊNCIA</option>
                <option value="JUDICIAL">JUDICIAL</option>
              </select>
            </div>`;

  if (!content.includes('name="carater"')) {
    content = content.replace(stField, caraterField);
  }
  
  fs.writeFileSync(path, content, 'utf8');
}

updateModal();
