// Handle logo upload
document.querySelector('.upload-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.querySelector('.company-logo');
          img.src = e.target.result;
          // Update hidden input with Base64 encoded image
          document.querySelector('input[name="logo"]').value = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  });
  
  // Handle logo deletion
  document.querySelector('.delete-btn').addEventListener('click', () => {
    const img = document.querySelector('.company-logo');
    img.src = '/placeholder-logo.png';
    document.querySelector('input[name="logo"]').value = '/placeholder-logo.png';
  });
  
  // Handle form submission
  const form = document.getElementById('ipo-form');
  const successMessage = document.getElementById('success-message');
  const registerButton = document.querySelector('.register');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerButton.disabled = true;
    
    try {
      const response = await fetch('/admin/ipo/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(new FormData(form)),
      });
  
      if (response.ok) {
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
          window.location.href = '/listings';  // Redirect after success
        }, 2000);
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit IPO. Please check console for details.');
    } finally {
      registerButton.disabled = false;
    }
  });
  
  // Handle cancel button
  document.querySelector('.cancel').addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      form.reset();
      document.querySelector('.company-logo').src = '/placeholder-logo.png';
      document.querySelector('input[name="logo"]').value = '/placeholder-logo.png';
    }
  });