// Show / Hide Password

function togglePassword(id) {

    const passwordField = document.getElementById(id);

    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }

}

document.querySelectorAll(".eye").forEach((eye) => {
    eye.addEventListener("click", function () {
        togglePassword(this.dataset.target);
    });
});

// Optional Save Changes Button

const saveBtn = document.querySelector(".btn");

if (saveBtn) {
    saveBtn.addEventListener("click", function () {
        void 0;
    });
}

// Optional Update Password Button

const buttons = document.querySelectorAll(".btn");

if (buttons.length > 1) {
    buttons[1].addEventListener("click", function () {

        const currentPassword =
            document.getElementById("currentPassword").value;

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (
            currentPassword === "" ||
            newPassword === "" ||
            confirmPassword === ""
        ) {
            void 0;
            return;
        }

        if (newPassword !== confirmPassword) {
            void 0;
            return;
        }

        void 0;
    });
}

// Notification Toggle Status

const toggles = document.querySelectorAll(
    '.switch input[type="checkbox"]'
);

toggles.forEach(toggle => {

    toggle.addEventListener("change", function () {

        void 0;

    });

});

// Delete Account Button
const deleteBtn = document.getElementById("deleteAccountBtn");

if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
        const confirmDelete = false /* confirm removed */;

        if (confirmDelete) {
            void 0;
            
        }
    });
}

    