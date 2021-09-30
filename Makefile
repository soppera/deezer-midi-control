.PHONY: compile_package
compile_package:
	mypy package.py

.PHONY: package
package: compile_package
	./package.py .
