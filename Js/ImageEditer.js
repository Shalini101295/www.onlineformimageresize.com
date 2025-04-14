       $(document).ready(function() {
		
		$("#exportBtn").css("dispaly","none");
            let model;
            async function loadModel() {
                model = await bodyPix.load();
            }
            loadModel();

            $("#imageUpload").change(function(event) {
                let files = event.target.files;
                $("#imagePreview").empty();
                
                for (let i = 0; i < files.length; i++) {
                    let reader = new FileReader();
                    reader.onload = function(e) {
                        let img = $("<img>").attr("src", e.target.result).addClass("uploaded-image");
                        $("#imagePreview").append(img);
                    };
                    reader.readAsDataURL(files[i]);
                }
            });
			
			
			$("#maintainAspectRatio").click(function() {
			if($("#maintainAspectRatio").is(":checked")){
	$("#height").css("display","none")
	$("#height").val("")
	}else
	{
	$("#height").css("display","")
	}
			});

$("#resizeBtn").click(function () {
    const inputWidth = parseInt($("#width").val());
    const inputHeight = parseInt($("#height").val());
    const maintainAspectRatio = $("#maintainAspectRatio").is(":checked");
    const targetSizeKB = parseInt($("#targetSize").val());

    $("#imagePreview img").each(function () {
        const previewImg = this;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = $(previewImg).attr("src");

        img.onload = function () {
            let imgWidth = img.width;
            let imgHeight = img.height;

            let targetWidth = inputWidth;
            let targetHeight = inputHeight;

            if (maintainAspectRatio) {
                const aspectRatio = imgWidth / imgHeight;

                if ($("#width").is(":focus")) {
                    targetHeight = Math.round(targetWidth / aspectRatio);
                } else if ($("#height").is(":focus")) {
                    targetWidth = Math.round(targetHeight * aspectRatio);
                } else {
                    targetHeight = Math.round(targetWidth / aspectRatio);
                }
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
			let resizedImage = canvas.toDataURL("image/jpeg");
            $(previewImg).attr("src", resizedImage);
            $(previewImg).data("edited-src", resizedImage);

            // Adjust quality until image size is close to target
            let quality = 0.95;
            let dataURL = canvas.toDataURL("image/jpeg", quality);
            let fileSizeKB = Math.round((dataURL.length * 3) / 4 / 1024); // Estimate size

			let quality1=(quality/fileSizeKB) * targetSizeKB
			quality1=quality1*1.3
			dataURL = canvas.toDataURL("image/jpeg", quality1);
			
			
			$(previewImg).attr("src", dataURL);
			$(previewImg).data("edited-src", dataURL);
			$("#exportBtn").removeClass("disabledexport");
			$("#exportBtn").addClass("reenableexport");
			
			$("#dropdownformat").removeClass("disabledexport");
			$("#dropdownformat").addClass("reenableexport");
	

        };
    });
});



          

            
            $("#exportBtn").click(function () {
    $("#imagePreview img").each(function (index) {
		const imgformat = $("#format").val();
		alert(imgformat)
        const img = new Image();
        const src = $(this).data("edited-src") || $(this).attr("src");
        img.src = src;
        img.crossOrigin = "anonymous";

        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const link = document.createElement("a");
            const isJPEG = src.startsWith("data:image/jpeg");
            link.href = isJPEG
                ? canvas.toDataURL("image/jpeg") 
                : canvas.toDataURL("image/png");

            link.download = `edited-image-${index}.${imgformat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    });
});

        });